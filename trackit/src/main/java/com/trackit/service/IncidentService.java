package com.trackit.service;

import com.trackit.dto.CreateIncidentRequest;
import com.trackit.dto.DashboardSummaryResponse;
import com.trackit.dto.IncidentFilterRequest;
import com.trackit.dto.IncidentResponse;
import com.trackit.dto.IncidentSummaryResponse;
import com.trackit.dto.PagedResponse;
import com.trackit.dto.StatusChangeRequest;
import com.trackit.dto.TicketAssigneeResponse;
import com.trackit.dto.UpdateIncidentRequest;
import com.trackit.exception.InvalidStatusTransitionException;
import com.trackit.exception.ResourceNotFoundException;
import com.trackit.exception.UnauthorizedException;
import com.trackit.exception.WorkflowViolationException;
import com.trackit.model.Counter;
import com.trackit.model.Incident;
import com.trackit.model.Role;
import com.trackit.model.User;
import com.trackit.model.WorkItem;
import com.trackit.model.enums.Impact;
import com.trackit.model.enums.IncidentStatus;
import com.trackit.model.enums.Priority;
import com.trackit.model.enums.SlaStatus;
import com.trackit.model.enums.Urgency;
import com.trackit.model.enums.WorkItemStatus;
import com.trackit.repository.IncidentRepository;
import com.trackit.repository.UserRepository;
import com.trackit.repository.WorkItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
public class IncidentService {

    private static final String ACCESS_DENIED = "Access denied";
    private static final Map<IncidentStatus, Set<IncidentStatus>> ALLOWED_TRANSITIONS = Map.of(
            IncidentStatus.OPEN, Set.of(IncidentStatus.ASSIGNED),
            IncidentStatus.ASSIGNED, Set.of(IncidentStatus.IN_PROGRESS, IncidentStatus.ON_HOLD),
            IncidentStatus.IN_PROGRESS, Set.of(IncidentStatus.ON_HOLD, IncidentStatus.RESOLVED),
            IncidentStatus.ON_HOLD, Set.of(IncidentStatus.IN_PROGRESS),
            IncidentStatus.RESOLVED, Set.of(IncidentStatus.CLOSED, IncidentStatus.REOPENED),
            IncidentStatus.REOPENED, Set.of(IncidentStatus.ASSIGNED),
            IncidentStatus.CLOSED, Set.of()
    );

    private final IncidentRepository incidentRepository;
    private final UserRepository userRepository;
    private final MongoTemplate mongoTemplate;
    private final PriorityService priorityService;
    private final WorkItemRepository workItemRepository;
    private final SlaService slaService;
    private final TicketRoutingService ticketRoutingService;

    public IncidentResponse createIncident(CreateIncidentRequest req, String createdByUserId) {
        Instant now = Instant.now();
        Incident incident = Incident.builder()
                .incidentNumber(nextIncidentNumber(now))
                .title(req.title().trim())
                .description(req.description().trim())
                .category(req.category().name())
                .affectedService(trimToNull(req.affectedService()))
                .impact(req.impact())
                .urgency(req.urgency())
                .priority(priorityService.calculatePriority(req.impact(), req.urgency()))
                .status(IncidentStatus.OPEN)
                .createdBy(createdByUserId)
                .createdAt(now)
                .updatedAt(now)
                .active(true)
                .build();
        slaService.initialize(incident, now);

        Incident saved = incidentRepository.save(incident);
        // Runs in the background, so raising a ticket never waits for the AI
        ticketRoutingService.recommendInBackground(saved.getId());
        return toResponse(saved);
    }

    public IncidentResponse getIncidentById(String id, String requestingUserId, Role role) {
        Incident incident = findActiveIncident(id);
        assertCanView(incident, requestingUserId, role);
        return toResponse(incident);
    }

    public PagedResponse<IncidentSummaryResponse> getIncidents(IncidentFilterRequest filter, Pageable pageable,
                                                               String userId, Role role) {
        List<Criteria> criteria = new ArrayList<>();
        criteria.add(Criteria.where("active").is(true));

        if (filter.status() != null) {
            criteria.add(Criteria.where("status").is(filter.status().name()));
        }
        if (filter.priority() != null) {
            List<Criteria> priorityMatches = new ArrayList<>();
            for (Impact impact : Impact.values()) {
                for (Urgency urgency : Urgency.values()) {
                    if (priorityService.calculatePriority(impact, urgency) == filter.priority()) {
                        priorityMatches.add(new Criteria().andOperator(
                                Criteria.where("impact").is(impact.name()),
                                Criteria.where("urgency").is(urgency.name())));
                    }
                }
            }
            criteria.add(new Criteria().orOperator(priorityMatches));
        }
        if (filter.category() != null) {
            criteria.add(Criteria.where("category").is(filter.category().name()));
        }
        if (StringUtils.hasText(filter.assignedTo())) {
            criteria.add(Criteria.where("assignedTo").is(filter.assignedTo().trim()));
        }

        Criteria scope = visibilityScope(userId, role);
        if (scope != null) {
            criteria.add(scope);
        }

        // andOperator (not chained addCriteria) so the same field may appear in both filter and scope
        Query query = new Query(new Criteria().andOperator(criteria));
        long total = mongoTemplate.count(query, Incident.class);
        List<Incident> incidents = mongoTemplate.find(query.with(pageable), Incident.class);

        Map<String, String> assigneeNames = resolveUserNames(incidents.stream().map(Incident::getAssignedTo));
        List<IncidentSummaryResponse> content = incidents.stream()
                .map(incident -> toSummary(incident, assigneeNames))
                .toList();

        return PagedResponse.of(content, pageable.getPageNumber(), pageable.getPageSize(), total);
    }

    public DashboardSummaryResponse getDashboardSummary(String userId, Role role) {
        List<Criteria> scope = new ArrayList<>();
        scope.add(Criteria.where("active").is(true));
        Criteria visibility = visibilityScope(userId, role);
        if (visibility != null) {
            scope.add(visibility);
        }

        return new DashboardSummaryResponse(
                countIncidents(scope, Criteria.where("status").is(IncidentStatus.OPEN.name())),
                countIncidents(scope, Criteria.where("status").is(IncidentStatus.IN_PROGRESS.name())),
                countIncidents(scope, Criteria.where("status").is(IncidentStatus.RESOLVED.name())),
                countIncidents(scope, Criteria.where("slaStatus").is(SlaStatus.BREACHED.name())));
    }

    public IncidentResponse updateIncident(String id, UpdateIncidentRequest req, String userId, Role role) {
        Incident incident = findActiveIncident(id);
        if (role != Role.EMPLOYEE || !Objects.equals(incident.getCreatedBy(), userId)) {
            throw new UnauthorizedException(ACCESS_DENIED);
        }
        if (incident.getStatus() != IncidentStatus.OPEN) {
            throw new WorkflowViolationException(
                    "Incident can only be edited while it is OPEN (current status: %s)".formatted(incident.getStatus()));
        }

        if (req.title() != null) {
            incident.setTitle(req.title().trim());
        }
        if (req.description() != null) {
            incident.setDescription(req.description().trim());
        }
        if (req.affectedService() != null) {
            incident.setAffectedService(trimToNull(req.affectedService()));
        }
        incident.setPriority(effectivePriority(incident));
        incident.setUpdatedAt(Instant.now());
        return toResponse(incidentRepository.save(incident));
    }

    public IncidentResponse changeStatus(String incidentId, StatusChangeRequest req,
                                         String actorUserId, Role role) {
        Incident incident = findActiveIncident(incidentId);
        if (role == Role.ENGINEER && !Objects.equals(actorUserId, incident.getAssignedTo())) {
            throw new UnauthorizedException("You are not assigned to this incident");
        }

        validateTransition(incident.getStatus(), req.newStatus());
        IncidentStatus previousStatus = incident.getStatus();
        Instant now = Instant.now();
        incident.setPriority(effectivePriority(incident));
        incident.setStatus(req.newStatus());
        incident.setUpdatedAt(now);
        slaService.onStatusChange(incident, previousStatus, now);
        return toResponse(incidentRepository.save(incident));
    }

    public void deleteIncident(String id, Role role) {
        if (role != Role.ADMIN) {
            throw new UnauthorizedException(ACCESS_DENIED);
        }
        Incident incident = findActiveIncident(id);
        incident.setActive(false);
        incident.setUpdatedAt(Instant.now());
        incidentRepository.save(incident);
    }

    private Incident findActiveIncident(String id) {
        return incidentRepository.findById(id)
                .filter(Incident::isActive)
                .orElseThrow(() -> new ResourceNotFoundException("Incident", "id", id));
    }

    private long countIncidents(List<Criteria> scope, Criteria filter) {
        List<Criteria> criteria = new ArrayList<>(scope);
        criteria.add(filter);
        return mongoTemplate.count(new Query(new Criteria().andOperator(criteria)), Incident.class);
    }

    private static void validateTransition(IncidentStatus current, IncidentStatus next) {
        if (!ALLOWED_TRANSITIONS.getOrDefault(current, Set.of()).contains(next)) {
            throw new InvalidStatusTransitionException(current, next);
        }
    }

    private Priority effectivePriority(Incident incident) {
        if (incident.getImpact() == null || incident.getUrgency() == null) {
            return incident.getPriority();
        }
        return priorityService.calculatePriority(incident.getImpact(), incident.getUrgency());
    }

    private void assertCanView(Incident incident, String userId, Role role) {
        boolean allowed = switch (role) {
            case EMPLOYEE -> Objects.equals(incident.getCreatedBy(), userId) || isWorkingOn(incident, userId);
            case ENGINEER -> Objects.equals(incident.getAssignedTo(), userId)
                    || departmentMemberIds(userId).contains(incident.getCreatedBy());
            case ADMIN -> true;
        };
        if (!allowed) {
            throw new UnauthorizedException(ACCESS_DENIED);
        }
    }

    /**
     * Which incidents a user may see; null means all. Employees see what they reported. Leads (engineers) see
     * what is assigned to them plus everything raised in their department, so new tickets show up before they
     * are assigned.
     */
    private Criteria visibilityScope(String userId, Role role) {
        return switch (role) {
            case EMPLOYEE -> Criteria.where("createdBy").is(userId);
            case ENGINEER -> {
                List<String> departmentMembers = departmentMemberIds(userId);
                yield departmentMembers.isEmpty()
                        ? Criteria.where("assignedTo").is(userId)
                        : new Criteria().orOperator(
                                Criteria.where("assignedTo").is(userId),
                                Criteria.where("createdBy").in(departmentMembers));
            }
            case ADMIN -> null;
        };
    }

    /** An employee the Lead assigned to the ticket, unless they declined it (or it was reassigned away). */
    private boolean isWorkingOn(Incident incident, String userId) {
        return workItemRepository.findByIncidentIdOrderByCreatedAtAsc(incident.getId()).stream()
                .anyMatch(w -> userId.equals(w.getAssignedTo()) && w.getStatus() != WorkItemStatus.DECLINED);
    }

    /** Everyone in the Lead's department; empty if the Lead has none. */
    private List<String> departmentMemberIds(String leadId) {
        return userRepository.findById(leadId)
                .map(User::getDepartmentId)
                .map(departmentId -> userRepository.findByDepartmentId(departmentId).stream().map(User::getId).toList())
                .orElse(List.of());
    }

    /** Atomically increments a per-year counter, producing e.g. {@code INC-2026-000001}. */
    private String nextIncidentNumber(Instant now) {
        int year = now.atZone(ZoneOffset.UTC).getYear();
        Counter counter = mongoTemplate.findAndModify(
                Query.query(Criteria.where("_id").is("incident-" + year)),
                new Update().inc("seq", 1),
                FindAndModifyOptions.options().returnNew(true).upsert(true),
                Counter.class);
        long seq = Objects.requireNonNull(counter, "Incident counter upsert returned null").getSeq();
        return "INC-%d-%06d".formatted(year, seq);
    }

    private Map<String, String> resolveUserNames(Stream<String> userIds) {
        Collection<String> ids = userIds.filter(Objects::nonNull).collect(Collectors.toSet());
        if (ids.isEmpty()) {
            return Map.of();
        }
        return userRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(User::getId, User::getName, (a, b) -> a));
    }

    private IncidentResponse toResponse(Incident incident) {
        List<WorkItem> work = incident.getId() == null
                ? List.of()
                : workItemRepository.findByIncidentIdOrderByCreatedAtAsc(incident.getId());
        Map<String, String> names = resolveUserNames(Stream.concat(
                Stream.of(incident.getCreatedBy(), incident.getAssignedTo()),
                work.stream().map(WorkItem::getAssignedTo)));
        Function<String, String> nameOf = id -> id == null ? null : names.get(id);
        Priority priority = effectivePriority(incident);
        return new IncidentResponse(
                incident.getId(),
                incident.getIncidentNumber(),
                incident.getTitle(),
                incident.getDescription(),
                incident.getCategory(),
                incident.getAffectedService(),
                incident.getImpact(),
                incident.getUrgency(),
                priority,
                priority == null ? null : priorityService.getPriorityLabel(priority),
                incident.getStatus(),
                slaService.statusAt(incident, Instant.now()),
                incident.getCreatedBy(),
                nameOf.apply(incident.getCreatedBy()),
                incident.getAssignedTo(),
                nameOf.apply(incident.getAssignedTo()),
                incident.getCreatedAt(),
                incident.getUpdatedAt(),
                incident.getDueAt(),
                work.stream()
                        .map(w -> new TicketAssigneeResponse(
                                w.getId(), w.getAssignedTo(), nameOf.apply(w.getAssignedTo()), w.getStatus()))
                        .toList());
    }

    private IncidentSummaryResponse toSummary(Incident incident, Map<String, String> assigneeNames) {
        String assignedTo = incident.getAssignedTo();
        Priority priority = effectivePriority(incident);
        return new IncidentSummaryResponse(
                incident.getId(),
                incident.getIncidentNumber(),
                incident.getTitle(),
                incident.getCategory(),
                priority,
                priority == null ? null : priorityService.getPriorityLabel(priority),
                incident.getStatus(),
                slaService.statusAt(incident, Instant.now()),
                incident.getDueAt(),
                incident.getCreatedAt(),
                assignedTo == null ? null : assigneeNames.get(assignedTo));
    }

    private static String trimToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }
}
