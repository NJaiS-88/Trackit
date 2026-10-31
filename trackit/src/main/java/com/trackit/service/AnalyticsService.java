package com.trackit.service;

import com.trackit.dto.AnalyticsResponse;
import com.trackit.dto.AnalyticsResponse.DepartmentStats;
import com.trackit.dto.AnalyticsResponse.IncidentStats;
import com.trackit.dto.AnalyticsResponse.PeopleStats;
import com.trackit.dto.AnalyticsResponse.ProjectStats;
import com.trackit.dto.AnalyticsResponse.TrendPoint;
import com.trackit.dto.AnalyticsResponse.WorkStats;
import com.trackit.dto.TeamAnalyticsResponse;
import com.trackit.dto.TeamAnalyticsResponse.EmployeeStats;
import com.trackit.dto.TeamAnalyticsResponse.ProjectProgress;
import com.trackit.exception.ResourceNotFoundException;
import com.trackit.exception.WorkflowViolationException;
import com.trackit.model.Department;
import com.trackit.model.Incident;
import com.trackit.model.Project;
import com.trackit.model.Role;
import com.trackit.model.User;
import com.trackit.model.WorkItem;
import com.trackit.model.enums.AccountRequestStatus;
import com.trackit.model.enums.IncidentStatus;
import com.trackit.model.enums.Priority;
import com.trackit.model.enums.ProjectStatus;
import com.trackit.model.enums.SlaStatus;
import com.trackit.model.enums.WorkItemStatus;
import com.trackit.model.enums.WorkItemType;
import com.trackit.repository.AccountRequestRepository;
import com.trackit.repository.DepartmentRepository;
import com.trackit.repository.IncidentRepository;
import com.trackit.repository.ProjectRepository;
import com.trackit.repository.UserRepository;
import com.trackit.repository.WorkItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.function.Predicate;
import java.util.stream.Collectors;

/** Builds the admin analytics snapshot from incidents, work, projects and people. */
@Service
@RequiredArgsConstructor
public class AnalyticsService {

    public static final Set<Integer> SUPPORTED_RANGES = Set.of(7, 30, 90);

    private static final Set<IncidentStatus> FINISHED = Set.of(IncidentStatus.RESOLVED, IncidentStatus.CLOSED);

    private final IncidentRepository incidentRepository;
    private final WorkItemRepository workItemRepository;
    private final ProjectRepository projectRepository;
    private final DepartmentRepository departmentRepository;
    private final UserRepository userRepository;
    private final AccountRequestRepository accountRequestRepository;
    private final PriorityService priorityService;
    private final SlaService slaService;

    /**
     * {@code zone} decides where "a day" starts, for the range and the trend buckets. {@code departmentId} limits
     * everything to one department (its people, the tickets they raised, its work and projects); null means all.
     */
    public AnalyticsResponse getAnalytics(int rangeDays, ZoneId zone, String departmentId) {
        Department selected = departmentId == null
                ? null
                : departmentRepository.findById(departmentId)
                        .orElseThrow(() -> new ResourceNotFoundException("Department", "id", departmentId));

        Instant now = Instant.now();
        LocalDate firstDay = LocalDate.now(zone).minusDays(rangeDays - 1L);
        Instant from = firstDay.atStartOfDay(zone).toInstant();

        List<User> allUsers = userRepository.findAll();
        Map<String, User> usersById = allUsers.stream().collect(Collectors.toMap(User::getId, Function.identity()));
        List<Incident> allIncidents = incidentRepository.findAll().stream().filter(Incident::isActive).toList();
        Map<String, Incident> incidentsById = allIncidents.stream()
                .collect(Collectors.toMap(Incident::getId, Function.identity()));

        Predicate<String> inScope = id -> selected == null || selected.getId().equals(id);
        List<User> users = allUsers.stream().filter(u -> inScope.test(u.getDepartmentId())).toList();
        List<Incident> incidents = allIncidents.stream()
                .filter(i -> selected == null || inScope.test(departmentOfReporter(i, usersById)))
                .toList();
        List<WorkItem> work = workItemRepository.findAll().stream()
                .filter(w -> inScope.test(w.getDepartmentId()))
                .toList();
        List<Project> projects = projectRepository.findAll().stream()
                .filter(p -> inScope.test(p.getDepartmentId()))
                .toList();
        List<Department> departments = selected == null ? departmentRepository.findAll() : List.of(selected);

        Predicate<WorkItem> overdue = w -> isOpen(w) && isPast(deadlineOf(w, incidentsById, zone), now);

        return new AnalyticsResponse(
                rangeDays,
                selected == null ? null : selected.getId(),
                selected == null ? null : selected.getName(),
                now,
                incidentStats(incidents, from, now),
                trend(incidents, firstDay, rangeDays, zone),
                workStats(work, from, overdue, incidentsById, zone),
                new ProjectStats(
                        countProjects(projects, ProjectStatus.ACTIVE),
                        countProjects(projects, ProjectStatus.ON_HOLD),
                        countProjects(projects, ProjectStatus.COMPLETED)),
                peopleStats(users),
                departmentStats(departments, users, usersById, incidents, work, projects, from, overdue,
                        incidentsById, zone));
    }

    /** The Lead's own department: its overview plus per-employee and per-project breakdowns. */
    public TeamAnalyticsResponse getTeamAnalytics(String leadId, int rangeDays, ZoneId zone) {
        String departmentId = userRepository.findById(leadId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", leadId))
                .getDepartmentId();
        if (departmentId == null) {
            throw new WorkflowViolationException("You have not been assigned to a department yet");
        }
        AnalyticsResponse overview = getAnalytics(rangeDays, zone, departmentId);

        Instant now = Instant.now();
        Instant from = LocalDate.now(zone).minusDays(rangeDays - 1L).atStartOfDay(zone).toInstant();
        Map<String, Incident> incidentsById = incidentRepository.findAll().stream()
                .collect(Collectors.toMap(Incident::getId, Function.identity()));
        List<WorkItem> work = workItemRepository.findByDepartmentIdOrderByCreatedAtDesc(departmentId);
        Predicate<WorkItem> overdue = w -> isOpen(w) && isPast(deadlineOf(w, incidentsById, zone), now);

        List<User> employees = userRepository
                .findByDepartmentIdAndRoleAndActiveTrueOrderByNameAsc(departmentId, Role.EMPLOYEE);
        List<Project> projects = projectRepository.findByDepartmentIdOrderByNameAsc(departmentId);
        Map<String, String> projectNames = projects.stream()
                .collect(Collectors.toMap(Project::getId, Project::getName));

        List<EmployeeStats> employeeStats = employees.stream().map(employee -> {
            List<WorkItem> theirs = work.stream().filter(w -> employee.getId().equals(w.getAssignedTo())).toList();
            List<WorkItem> completed = completedSince(theirs, from);
            Double avgHours = completed.stream()
                    .filter(w -> assignedAt(w) != null && w.getCompletedAt() != null)
                    .mapToLong(w -> Duration.between(assignedAt(w), w.getCompletedAt()).toMinutes())
                    .average()
                    .stream()
                    .mapToObj(minutes -> round1(minutes / 60.0))
                    .findFirst()
                    .orElse(null);
            return new EmployeeStats(
                    employee.getId(),
                    employee.getName(),
                    employee.getProjectId() == null ? null : projectNames.get(employee.getProjectId()),
                    theirs.stream().filter(w -> w.getStatus() == WorkItemStatus.ASSIGNED).count(),
                    theirs.stream().filter(w -> w.getStatus() == WorkItemStatus.IN_PROGRESS).count(),
                    theirs.stream().filter(overdue).count(),
                    theirs.stream().filter(w -> w.getStatus() == WorkItemStatus.DECLINED).count(),
                    completed.size(),
                    onTimePercent(completed, incidentsById, zone),
                    avgHours);
        }).toList();

        List<ProjectProgress> projectProgress = projects.stream().map(project -> {
            List<WorkItem> tasks = work.stream().filter(w -> project.getId().equals(w.getProjectId())).toList();
            long completed = tasks.stream().filter(w -> w.getStatus() == WorkItemStatus.COMPLETED).count();
            Instant nextDeadline = tasks.stream()
                    .filter(AnalyticsService::isOpen)
                    .map(w -> deadlineOf(w, incidentsById, zone))
                    .filter(Objects::nonNull)
                    .min(Comparator.naturalOrder())
                    .orElse(null);
            return new ProjectProgress(
                    project.getId(),
                    project.getName(),
                    statusOf(project),
                    employees.stream().filter(e -> project.getId().equals(e.getProjectId())).count(),
                    tasks.size(),
                    completed,
                    tasks.stream().filter(AnalyticsService::isOpen).count(),
                    tasks.stream().filter(overdue).count(),
                    percent(completed, tasks.size()),
                    nextDeadline);
        }).toList();

        return new TeamAnalyticsResponse(overview, employeeStats, projectProgress);
    }

    private static String departmentOfReporter(Incident incident, Map<String, User> usersById) {
        User reporter = usersById.get(incident.getCreatedBy());
        return reporter == null ? null : reporter.getDepartmentId();
    }

    private IncidentStats incidentStats(List<Incident> incidents, Instant from, Instant now) {
        List<Incident> open = incidents.stream().filter(i -> !FINISHED.contains(i.getStatus())).toList();
        List<Incident> resolvedInRange = incidents.stream()
                .filter(i -> FINISHED.contains(i.getStatus()) && isOnOrAfter(i.getResolvedAt(), from))
                .toList();
        List<Incident> measured = resolvedInRange.stream().filter(i -> i.getDueAt() != null).toList();
        long met = measured.stream().filter(i -> !i.getResolvedAt().isAfter(i.getDueAt())).count();

        Double avgHours = resolvedInRange.stream()
                .filter(i -> i.getCreatedAt() != null)
                .mapToLong(i -> Duration.between(i.getCreatedAt(), i.getResolvedAt()).toMinutes())
                .average()
                .stream()
                .mapToObj(minutes -> round1(minutes / 60.0))
                .findFirst()
                .orElse(null);

        Map<Priority, Long> byPriority = new EnumMap<>(Priority.class);
        for (Priority priority : Priority.values()) {
            byPriority.put(priority, open.stream().filter(i -> priorityOf(i) == priority).count());
        }

        return new IncidentStats(
                open.size(),
                open.stream().filter(i -> slaService.statusAt(i, now) == SlaStatus.BREACHED).count(),
                incidents.stream().filter(i -> isOnOrAfter(i.getCreatedAt(), from)).count(),
                resolvedInRange.size(),
                met,
                measured.size() - met,
                percent(met, measured.size()),
                avgHours,
                byPriority);
    }

    /** Daily buckets for ranges up to a month, weekly beyond that. */
    private static List<TrendPoint> trend(List<Incident> incidents, LocalDate firstDay, int rangeDays, ZoneId zone) {
        int bucketDays = rangeDays <= 31 ? 1 : 7;
        LocalDate endOfRange = firstDay.plusDays(rangeDays);
        List<TrendPoint> points = new ArrayList<>();
        for (LocalDate start = firstDay; start.isBefore(endOfRange); start = start.plusDays(bucketDays)) {
            LocalDate end = start.plusDays(bucketDays);
            if (end.isAfter(endOfRange)) {
                end = endOfRange;
            }
            Instant startAt = start.atStartOfDay(zone).toInstant();
            Instant endAt = end.atStartOfDay(zone).toInstant();
            long created = incidents.stream().filter(i -> isWithin(i.getCreatedAt(), startAt, endAt)).count();
            long resolved = incidents.stream()
                    .filter(i -> FINISHED.contains(i.getStatus()) && isWithin(i.getResolvedAt(), startAt, endAt))
                    .count();
            points.add(new TrendPoint(start, (int) Duration.between(startAt, endAt).toDays(), created, resolved));
        }
        return points;
    }

    private static WorkStats workStats(List<WorkItem> work, Instant from, Predicate<WorkItem> overdue,
                                       Map<String, Incident> incidentsById, ZoneId zone) {
        List<WorkItem> completedInRange = completedSince(work, from);
        return new WorkStats(
                work.stream().filter(w -> w.getStatus() == WorkItemStatus.ASSIGNED).count(),
                work.stream().filter(w -> w.getStatus() == WorkItemStatus.IN_PROGRESS).count(),
                work.stream().filter(w -> w.getStatus() == WorkItemStatus.DECLINED).count(),
                work.stream().filter(overdue).count(),
                work.stream().filter(w -> isOnOrAfter(assignedAt(w), from)).count(),
                completedInRange.size(),
                onTimePercent(completedInRange, incidentsById, zone));
    }

    private PeopleStats peopleStats(List<User> users) {
        List<User> active = users.stream().filter(User::isActive).toList();
        return new PeopleStats(
                active.stream().filter(u -> u.getRole() == Role.EMPLOYEE).count(),
                active.stream().filter(u -> u.getRole() == Role.ENGINEER).count(),
                active.stream().filter(u -> u.getRole() == Role.ADMIN).count(),
                users.size() - active.size(),
                accountRequestRepository.countByStatus(AccountRequestStatus.PENDING));
    }

    private List<DepartmentStats> departmentStats(List<Department> departments, List<User> users,
                                                  Map<String, User> usersById, List<Incident> incidents,
                                                  List<WorkItem> work, List<Project> projects, Instant from,
                                                  Predicate<WorkItem> overdue, Map<String, Incident> incidentsById,
                                                  ZoneId zone) {
        return departments.stream()
                .sorted(Comparator.comparing(Department::getName, String.CASE_INSENSITIVE_ORDER))
                .map(department -> {
                    String id = department.getId();
                    List<User> members = users.stream()
                            .filter(u -> u.isActive() && id.equals(u.getDepartmentId()))
                            .toList();
                    List<WorkItem> departmentWork = work.stream().filter(w -> id.equals(w.getDepartmentId())).toList();
                    List<WorkItem> completed = completedSince(departmentWork, from);
                    return new DepartmentStats(
                            id,
                            department.getName(),
                            members.stream().filter(u -> u.getRole() == Role.ENGINEER)
                                    .map(User::getName).sorted().toList(),
                            members.stream().filter(u -> u.getRole() == Role.EMPLOYEE).count(),
                            incidents.stream()
                                    .filter(i -> !FINISHED.contains(i.getStatus()))
                                    .filter(i -> {
                                        User reporter = usersById.get(i.getCreatedBy());
                                        return reporter != null && id.equals(reporter.getDepartmentId());
                                    })
                                    .count(),
                            projects.stream()
                                    .filter(p -> id.equals(p.getDepartmentId()) && statusOf(p) == ProjectStatus.ACTIVE)
                                    .count(),
                            departmentWork.stream().filter(AnalyticsService::isOpen).count(),
                            departmentWork.stream().filter(overdue).count(),
                            completed.size(),
                            onTimePercent(completed, incidentsById, zone));
                })
                .toList();
    }

    // ---------- Helpers ----------

    /** Work still to be done: assigned, in progress, or declined and waiting to be reassigned. */
    private static boolean isOpen(WorkItem w) {
        return WorkItemStatus.OPEN.contains(w.getStatus());
    }

    /** A project task's due date and time, or a ticket's SLA deadline. */
    private static Instant deadlineOf(WorkItem w, Map<String, Incident> incidentsById, ZoneId zone) {
        if (w.getType() == WorkItemType.TICKET) {
            Incident incident = w.getIncidentId() == null ? null : incidentsById.get(w.getIncidentId());
            return incident == null ? null : incident.getDueAt();
        }
        if (w.getDueDate() == null) {
            return null;
        }
        LocalTime time = Objects.requireNonNullElse(w.getDueTime(), LocalTime.MAX);
        return w.getDueDate().atTime(time).atZone(zone).toInstant();
    }

    private static Double onTimePercent(List<WorkItem> completed, Map<String, Incident> incidentsById, ZoneId zone) {
        long measured = 0;
        long onTime = 0;
        for (WorkItem w : completed) {
            Instant deadline = deadlineOf(w, incidentsById, zone);
            if (deadline == null || w.getCompletedAt() == null) {
                continue;
            }
            measured++;
            if (!w.getCompletedAt().isAfter(deadline)) {
                onTime++;
            }
        }
        return percent(onTime, measured);
    }

    private static List<WorkItem> completedSince(List<WorkItem> work, Instant from) {
        return work.stream()
                .filter(w -> w.getStatus() == WorkItemStatus.COMPLETED && isOnOrAfter(w.getCompletedAt(), from))
                .toList();
    }

    private static Instant assignedAt(WorkItem w) {
        return w.getAssignedAt() != null ? w.getAssignedAt() : w.getCreatedAt();
    }

    private Priority priorityOf(Incident incident) {
        if (incident.getImpact() == null || incident.getUrgency() == null) {
            return Objects.requireNonNullElse(incident.getPriority(), Priority.P3);
        }
        return priorityService.calculatePriority(incident.getImpact(), incident.getUrgency());
    }

    private static ProjectStatus statusOf(Project project) {
        return project.getStatus() == null ? ProjectStatus.ACTIVE : project.getStatus();
    }

    private static long countProjects(List<Project> projects, ProjectStatus status) {
        return projects.stream().filter(p -> statusOf(p) == status).count();
    }

    private static boolean isPast(Instant deadline, Instant now) {
        return deadline != null && now.isAfter(deadline);
    }

    private static boolean isOnOrAfter(Instant value, Instant from) {
        return value != null && !value.isBefore(from);
    }

    private static boolean isWithin(Instant value, Instant start, Instant end) {
        return value != null && !value.isBefore(start) && value.isBefore(end);
    }

    private static Double percent(long part, long whole) {
        return whole == 0 ? null : round1(part * 100.0 / whole);
    }

    private static double round1(double value) {
        return Math.round(value * 10) / 10.0;
    }
}
