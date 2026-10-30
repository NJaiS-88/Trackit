package com.trackit.service;

import com.trackit.dto.AssignTicketRequest;
import com.trackit.dto.AssignWorkRequest;
import com.trackit.dto.CreateTaskRequest;
import com.trackit.dto.TeamTicketResponse;
import com.trackit.dto.TicketAssigneeResponse;
import com.trackit.dto.WorkItemResponse;
import com.trackit.exception.ResourceNotFoundException;
import com.trackit.exception.UnauthorizedException;
import com.trackit.exception.WorkflowViolationException;
import com.trackit.model.Department;
import com.trackit.model.Incident;
import com.trackit.model.Project;
import com.trackit.model.Role;
import com.trackit.model.User;
import com.trackit.model.WorkItem;
import com.trackit.model.enums.IncidentStatus;
import com.trackit.model.enums.Priority;
import com.trackit.model.enums.ProjectStatus;
import com.trackit.model.enums.WorkItemStatus;
import com.trackit.model.enums.WorkItemType;
import com.trackit.repository.DepartmentRepository;
import com.trackit.repository.IncidentRepository;
import com.trackit.repository.ProjectRepository;
import com.trackit.repository.UserRepository;
import com.trackit.repository.WorkItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * Work a Lead hands to employees in their own department: project tasks and tickets raised there.
 * Several employees can share a ticket, each with their own work item. The ticket follows them: assigned,
 * in progress while anyone is working, and resolved once everyone assigned has completed their part.
 */
@Service
@RequiredArgsConstructor
public class WorkItemService {

    private static final Set<IncidentStatus> FINISHED_TICKET = Set.of(IncidentStatus.RESOLVED, IncidentStatus.CLOSED);
    private static final Set<WorkItemStatus> ACTIONABLE = Set.of(WorkItemStatus.ASSIGNED, WorkItemStatus.IN_PROGRESS);

    private final WorkItemRepository workItemRepository;
    private final UserRepository userRepository;
    private final ProjectRepository projectRepository;
    private final DepartmentRepository departmentRepository;
    private final IncidentRepository incidentRepository;
    private final MongoTemplate mongoTemplate;
    private final PriorityService priorityService;
    private final SlaService slaService;

    // ---------- Lead ----------

    public List<WorkItemResponse> getTeamWork(String leadId) {
        String departmentId = findUser(leadId).getDepartmentId();
        if (departmentId == null) {
            return List.of();
        }
        return toResponses(workItemRepository.findByDepartmentIdOrderByCreatedAtDesc(departmentId));
    }

    /** Unresolved tickets raised by anyone in the Lead's department, newest first. */
    public List<TeamTicketResponse> getTeamTickets(String leadId) {
        String departmentId = findUser(leadId).getDepartmentId();
        if (departmentId == null) {
            return List.of();
        }
        Map<String, String> reporterNames = userRepository.findByDepartmentId(departmentId).stream()
                .collect(Collectors.toMap(User::getId, User::getName));
        if (reporterNames.isEmpty()) {
            return List.of();
        }

        Query query = new Query(new Criteria().andOperator(
                Criteria.where("createdBy").in(reporterNames.keySet()),
                Criteria.where("active").is(true),
                Criteria.where("status").nin(FINISHED_TICKET.stream().map(Enum::name).toList())))
                .with(Sort.by(Sort.Direction.DESC, "createdAt"));
        List<Incident> incidents = mongoTemplate.find(query, Incident.class);
        if (incidents.isEmpty()) {
            return List.of();
        }

        Map<String, List<WorkItem>> workByIncident = workItemRepository
                .findByIncidentIdInOrderByCreatedAtAsc(incidents.stream().map(Incident::getId).toList())
                .stream()
                .collect(Collectors.groupingBy(WorkItem::getIncidentId));
        Map<String, String> assigneeNames = userNames(workByIncident.values().stream()
                .flatMap(List::stream).map(WorkItem::getAssignedTo));

        return incidents.stream().map(incident -> {
            Priority priority = priorityOf(incident);
            return new TeamTicketResponse(
                    incident.getId(),
                    incident.getIncidentNumber(),
                    incident.getTitle(),
                    incident.getDescription(),
                    incident.getCategory(),
                    priority,
                    priority == null ? null : priorityService.getPriorityLabel(priority),
                    incident.getStatus(),
                    reporterNames.get(incident.getCreatedBy()),
                    incident.getCreatedAt(),
                    toAssignees(workByIncident.getOrDefault(incident.getId(), List.of()), assigneeNames));
        }).toList();
    }

    /** Gives the same task to every chosen employee; all must be on the project. */
    public List<WorkItemResponse> createTask(String leadId, CreateTaskRequest request) {
        String departmentId = requireDepartment(findUser(leadId));
        Project project = projectRepository.findById(request.projectId())
                .filter(p -> departmentId.equals(p.getDepartmentId()))
                .orElseThrow(() -> new ResourceNotFoundException("Project", "id", request.projectId()));
        if (project.getStatus() == ProjectStatus.COMPLETED) {
            throw new WorkflowViolationException("Work cannot be added to a completed project");
        }
        List<User> assignees = findDepartmentEmployees(departmentId, request.assigneeIds());
        assignees.forEach(assignee -> requireOnProject(assignee, project.getId(), project.getName()));

        Instant now = Instant.now();
        List<WorkItem> items = assignees.stream()
                .map(assignee -> WorkItem.builder()
                        .type(WorkItemType.PROJECT_TASK)
                        .title(request.title().trim())
                        .description(trimToNull(request.description()))
                        .departmentId(departmentId)
                        .projectId(project.getId())
                        .assignedTo(assignee.getId())
                        .assignedBy(leadId)
                        .status(WorkItemStatus.ASSIGNED)
                        .dueDate(request.dueDate())
                        .createdAt(now)
                        .updatedAt(now)
                        .build())
                .toList();
        return toResponses(workItemRepository.saveAll(items));
    }

    /**
     * Assigns a ticket to one or more employees, each with their own work item. Employees can be added to a
     * ticket that is already being worked on; the ticket resolves once everyone assigned has completed it.
     */
    public List<WorkItemResponse> assignTicket(String leadId, String incidentId, AssignTicketRequest request) {
        String departmentId = requireDepartment(findUser(leadId));
        Incident incident = incidentRepository.findById(incidentId)
                .filter(Incident::isActive)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket", "id", incidentId));
        boolean raisedInDepartment = userRepository.findById(incident.getCreatedBy())
                .map(reporter -> departmentId.equals(reporter.getDepartmentId()))
                .orElse(false);
        if (!raisedInDepartment) {
            throw new UnauthorizedException("This ticket was not raised in your department");
        }
        if (FINISHED_TICKET.contains(incident.getStatus())) {
            throw new WorkflowViolationException(
                    "This ticket is already " + incident.getStatus().name().toLowerCase(Locale.ROOT));
        }
        List<User> assignees = findDepartmentEmployees(departmentId, request.assigneeIds());

        Set<String> alreadyAssigned = workItemRepository.findByIncidentIdOrderByCreatedAtAsc(incidentId).stream()
                .filter(w -> WorkItemStatus.OPEN.contains(w.getStatus()))
                .map(WorkItem::getAssignedTo)
                .collect(Collectors.toSet());
        List<String> duplicates = assignees.stream()
                .filter(u -> alreadyAssigned.contains(u.getId()))
                .map(User::getName)
                .toList();
        if (!duplicates.isEmpty()) {
            throw new WorkflowViolationException("Already assigned to this ticket: " + String.join(", ", duplicates));
        }

        Instant now = Instant.now();
        List<WorkItem> items = workItemRepository.saveAll(assignees.stream()
                .map(assignee -> WorkItem.builder()
                        .type(WorkItemType.TICKET)
                        .title(incident.getTitle())
                        .description(incident.getDescription())
                        .departmentId(departmentId)
                        .incidentId(incident.getId())
                        .assignedTo(assignee.getId())
                        .assignedBy(leadId)
                        .status(WorkItemStatus.ASSIGNED)
                        .dueDate(request.dueDate())
                        .createdAt(now)
                        .updatedAt(now)
                        .build())
                .toList());

        // The Lead owns the ticket; the employees do the work
        IncidentStatus previousStatus = incident.getStatus();
        if (previousStatus == IncidentStatus.OPEN || previousStatus == IncidentStatus.REOPENED) {
            incident.setStatus(IncidentStatus.ASSIGNED);
            slaService.onStatusChange(incident, previousStatus, now);
        }
        incident.setAssignedTo(leadId);
        incident.setUpdatedAt(now);
        incidentRepository.save(incident);
        return toResponses(items);
    }

    /** Hands open work (typically declined) to another employee, or back to the same one. */
    public WorkItemResponse reassign(String leadId, String workItemId, AssignWorkRequest request) {
        String departmentId = requireDepartment(findUser(leadId));
        WorkItem item = workItemRepository.findById(workItemId)
                .filter(w -> departmentId.equals(w.getDepartmentId()))
                .orElseThrow(() -> new ResourceNotFoundException("Work item", "id", workItemId));
        if (item.getStatus() == WorkItemStatus.COMPLETED) {
            throw new WorkflowViolationException("Completed work cannot be reassigned");
        }
        User assignee = findDepartmentEmployee(departmentId, request.assigneeId());
        if (item.getType() == WorkItemType.PROJECT_TASK) {
            String projectName = projectRepository.findById(item.getProjectId()).map(Project::getName).orElse("this");
            requireOnProject(assignee, item.getProjectId(), projectName);
        }
        if (item.getType() == WorkItemType.TICKET && !assignee.getId().equals(item.getAssignedTo())) {
            boolean alreadyOnTicket = workItemRepository.findByIncidentIdOrderByCreatedAtAsc(item.getIncidentId())
                    .stream()
                    .anyMatch(w -> assignee.getId().equals(w.getAssignedTo())
                            && WorkItemStatus.OPEN.contains(w.getStatus()));
            if (alreadyOnTicket) {
                throw new WorkflowViolationException(assignee.getName() + " is already assigned to this ticket");
            }
        }

        item.setAssignedTo(assignee.getId());
        item.setAssignedBy(leadId);
        item.setStatus(WorkItemStatus.ASSIGNED);
        item.setDeclineReason(null);
        if (request.dueDate() != null) {
            item.setDueDate(request.dueDate());
        }
        item.setUpdatedAt(Instant.now());
        WorkItem saved = workItemRepository.save(item);
        pauseTicketIfIdle(saved);
        return toResponse(saved);
    }

    // ---------- Employee ----------

    public List<WorkItemResponse> getMyWork(String userId) {
        return toResponses(workItemRepository.findByAssignedToOrderByCreatedAtDesc(userId));
    }

    public WorkItemResponse start(String userId, String workItemId) {
        WorkItem item = findOwnWork(userId, workItemId);
        if (item.getStatus() != WorkItemStatus.ASSIGNED) {
            throw new WorkflowViolationException("Only newly assigned work can be started");
        }
        item.setStatus(WorkItemStatus.IN_PROGRESS);
        item.setUpdatedAt(Instant.now());
        WorkItem saved = workItemRepository.save(item);
        syncTicket(saved, Set.of(IncidentStatus.OPEN, IncidentStatus.ASSIGNED, IncidentStatus.REOPENED),
                IncidentStatus.IN_PROGRESS);
        return toResponse(saved);
    }

    public WorkItemResponse complete(String userId, String workItemId) {
        WorkItem item = findOwnWork(userId, workItemId);
        if (!ACTIONABLE.contains(item.getStatus())) {
            throw new WorkflowViolationException("This work is already " + describe(item.getStatus()));
        }
        Instant now = Instant.now();
        item.setStatus(WorkItemStatus.COMPLETED);
        item.setCompletedAt(now);
        item.setUpdatedAt(now);
        WorkItem saved = workItemRepository.save(item);
        resolveTicketIfAllDone(saved);
        return toResponse(saved);
    }

    public WorkItemResponse decline(String userId, String workItemId, String reason) {
        WorkItem item = findOwnWork(userId, workItemId);
        if (!ACTIONABLE.contains(item.getStatus())) {
            throw new WorkflowViolationException("This work is already " + describe(item.getStatus()));
        }
        item.setStatus(WorkItemStatus.DECLINED);
        item.setDeclineReason(reason.trim());
        item.setUpdatedAt(Instant.now());
        WorkItem saved = workItemRepository.save(item);
        pauseTicketIfIdle(saved);
        return toResponse(saved);
    }

    // ---------- Admin ----------

    public List<WorkItemResponse> getAllWork() {
        return toResponses(workItemRepository.findAllByOrderByCreatedAtDesc());
    }

    // ---------- Helpers ----------

    private void syncTicket(WorkItem item, Set<IncidentStatus> from, IncidentStatus to) {
        if (item.getType() != WorkItemType.TICKET || item.getIncidentId() == null) {
            return;
        }
        incidentRepository.findById(item.getIncidentId())
                .filter(Incident::isActive)
                .filter(incident -> from.contains(incident.getStatus()))
                .ifPresent(incident -> {
                    IncidentStatus previousStatus = incident.getStatus();
                    Instant now = Instant.now();
                    incident.setStatus(to);
                    incident.setUpdatedAt(now);
                    slaService.onStatusChange(incident, previousStatus, now);
                    incidentRepository.save(incident);
                });
    }

    /** A ticket is resolved once every employee assigned to it has completed their part. */
    private void resolveTicketIfAllDone(WorkItem item) {
        if (item.getType() != WorkItemType.TICKET || item.getIncidentId() == null) {
            return;
        }
        boolean allDone = workItemRepository.findByIncidentIdOrderByCreatedAtAsc(item.getIncidentId()).stream()
                .allMatch(w -> w.getStatus() == WorkItemStatus.COMPLETED);
        if (allDone) {
            syncTicket(item, Set.of(IncidentStatus.OPEN, IncidentStatus.ASSIGNED, IncidentStatus.IN_PROGRESS,
                    IncidentStatus.ON_HOLD, IncidentStatus.REOPENED), IncidentStatus.RESOLVED);
        }
    }

    /** Moves an in-progress ticket back to Assigned when nobody assigned to it is working on it any more. */
    private void pauseTicketIfIdle(WorkItem item) {
        if (item.getType() != WorkItemType.TICKET || item.getIncidentId() == null) {
            return;
        }
        boolean someoneWorking = workItemRepository.findByIncidentIdOrderByCreatedAtAsc(item.getIncidentId()).stream()
                .anyMatch(w -> w.getStatus() == WorkItemStatus.IN_PROGRESS);
        if (!someoneWorking) {
            syncTicket(item, Set.of(IncidentStatus.IN_PROGRESS), IncidentStatus.ASSIGNED);
        }
    }

    /** Each employee once, in the order given; all must be active employees of the department. */
    private List<User> findDepartmentEmployees(String departmentId, List<String> userIds) {
        return new LinkedHashSet<>(userIds).stream()
                .map(id -> findDepartmentEmployee(departmentId, id))
                .toList();
    }

    private static List<TicketAssigneeResponse> toAssignees(List<WorkItem> items, Map<String, String> names) {
        return items.stream()
                .map(w -> new TicketAssigneeResponse(
                        w.getId(), w.getAssignedTo(), names.get(w.getAssignedTo()), w.getStatus()))
                .toList();
    }

    private User findUser(String userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));
    }

    private User findDepartmentEmployee(String departmentId, String userId) {
        return userRepository.findById(userId)
                .filter(u -> u.isActive() && u.getRole() == Role.EMPLOYEE)
                .filter(u -> departmentId.equals(u.getDepartmentId()))
                .orElseThrow(() -> new UnauthorizedException("This employee is not in your department"));
    }

    private WorkItem findOwnWork(String userId, String workItemId) {
        return workItemRepository.findById(workItemId)
                .filter(w -> userId.equals(w.getAssignedTo()))
                .orElseThrow(() -> new ResourceNotFoundException("Work item", "id", workItemId));
    }

    private static void requireOnProject(User assignee, String projectId, String projectName) {
        if (!Objects.equals(projectId, assignee.getProjectId())) {
            throw new WorkflowViolationException(
                    "%s is not on the %s project. Assign them to it on My Team first."
                            .formatted(assignee.getName(), projectName));
        }
    }

    private static String requireDepartment(User lead) {
        if (lead.getDepartmentId() == null) {
            throw new WorkflowViolationException("You have not been assigned to a department yet");
        }
        return lead.getDepartmentId();
    }

    private Priority priorityOf(Incident incident) {
        if (incident.getImpact() == null || incident.getUrgency() == null) {
            return incident.getPriority();
        }
        return priorityService.calculatePriority(incident.getImpact(), incident.getUrgency());
    }

    private static String describe(WorkItemStatus status) {
        return status.name().toLowerCase(Locale.ROOT).replace('_', ' ');
    }

    private static String trimToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private WorkItemResponse toResponse(WorkItem item) {
        return toResponses(List.of(item)).getFirst();
    }

    /** Resolves every referenced name with one query per collection. */
    private List<WorkItemResponse> toResponses(List<WorkItem> items) {
        if (items.isEmpty()) {
            return List.of();
        }
        Map<String, String> users = userNames(items.stream()
                .flatMap(w -> Stream.of(w.getAssignedTo(), w.getAssignedBy())));
        Map<String, String> projects = projectRepository.findAllById(ids(items.stream().map(WorkItem::getProjectId)))
                .stream().collect(Collectors.toMap(Project::getId, Project::getName));
        Map<String, String> departments = departmentRepository
                .findAllById(ids(items.stream().map(WorkItem::getDepartmentId)))
                .stream().collect(Collectors.toMap(Department::getId, Department::getName));
        Map<String, Incident> incidents = incidentRepository
                .findAllById(ids(items.stream().map(WorkItem::getIncidentId)))
                .stream().collect(Collectors.toMap(Incident::getId, Function.identity()));

        return items.stream().map(w -> {
            Incident incident = w.getIncidentId() == null ? null : incidents.get(w.getIncidentId());
            return new WorkItemResponse(
                    w.getId(),
                    w.getType(),
                    w.getTitle(),
                    w.getDescription(),
                    w.getStatus(),
                    w.getDepartmentId(),
                    departments.get(w.getDepartmentId()),
                    w.getProjectId(),
                    w.getProjectId() == null ? null : projects.get(w.getProjectId()),
                    w.getIncidentId(),
                    incident == null ? null : incident.getIncidentNumber(),
                    incident == null ? null : priorityOf(incident),
                    w.getAssignedTo(),
                    users.get(w.getAssignedTo()),
                    users.get(w.getAssignedBy()),
                    w.getDueDate(),
                    w.getDeclineReason(),
                    w.getCreatedAt(),
                    w.getUpdatedAt(),
                    w.getCompletedAt());
        }).toList();
    }

    private Map<String, String> userNames(Stream<String> userIds) {
        Collection<String> ids = ids(userIds);
        if (ids.isEmpty()) {
            return Map.of();
        }
        return userRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(User::getId, User::getName, (a, b) -> a));
    }

    private static Set<String> ids(Stream<String> ids) {
        return ids.filter(Objects::nonNull).collect(Collectors.toSet());
    }
}
