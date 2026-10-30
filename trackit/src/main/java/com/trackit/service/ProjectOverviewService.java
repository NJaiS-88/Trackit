package com.trackit.service;

import com.trackit.dto.AdminProjectResponse;
import com.trackit.model.Department;
import com.trackit.model.Project;
import com.trackit.model.Role;
import com.trackit.model.User;
import com.trackit.model.WorkItem;
import com.trackit.model.enums.ProjectStatus;
import com.trackit.model.enums.WorkItemStatus;
import com.trackit.repository.DepartmentRepository;
import com.trackit.repository.ProjectRepository;
import com.trackit.repository.UserRepository;
import com.trackit.repository.WorkItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/** Read-only view of every department's projects for admins. */
@Service
@RequiredArgsConstructor
public class ProjectOverviewService {

    private final ProjectRepository projectRepository;
    private final DepartmentRepository departmentRepository;
    private final UserRepository userRepository;
    private final WorkItemRepository workItemRepository;

    public List<AdminProjectResponse> getProjects() {
        List<Project> projects = projectRepository.findAll();
        if (projects.isEmpty()) {
            return List.of();
        }

        Set<String> departmentIds = projects.stream().map(Project::getDepartmentId)
                .filter(Objects::nonNull).collect(Collectors.toSet());
        Map<String, String> departmentNames = departmentRepository.findAllById(departmentIds).stream()
                .collect(Collectors.toMap(Department::getId, Department::getName));
        Map<String, List<String>> leadsByDepartment = userRepository
                .findByDepartmentIdInAndRoleAndActiveTrueOrderByNameAsc(departmentIds, Role.ENGINEER).stream()
                .collect(Collectors.groupingBy(User::getDepartmentId,
                        Collectors.mapping(User::getName, Collectors.toList())));

        Set<String> projectIds = projects.stream().map(Project::getId).collect(Collectors.toSet());
        // Only employees still in the project's department count; a stale link is ignored
        Map<String, Project> projectsById = projects.stream()
                .collect(Collectors.toMap(Project::getId, Function.identity()));
        Map<String, List<String>> employeesByProject = userRepository
                .findByProjectIdInAndRoleAndActiveTrueOrderByNameAsc(projectIds, Role.EMPLOYEE).stream()
                .filter(u -> Objects.equals(u.getDepartmentId(), projectsById.get(u.getProjectId()).getDepartmentId()))
                .collect(Collectors.groupingBy(User::getProjectId,
                        Collectors.mapping(User::getName, Collectors.toList())));

        List<WorkItem> tasks = workItemRepository.findByProjectIdIn(projectIds);
        Map<String, Long> taskCounts = tasks.stream()
                .collect(Collectors.groupingBy(WorkItem::getProjectId, Collectors.counting()));
        Map<String, Long> completedCounts = tasks.stream()
                .filter(w -> w.getStatus() == WorkItemStatus.COMPLETED)
                .collect(Collectors.groupingBy(WorkItem::getProjectId, Collectors.counting()));

        return projects.stream()
                .map(p -> new AdminProjectResponse(
                        p.getId(),
                        p.getName(),
                        p.getStatus() == null ? ProjectStatus.ACTIVE : p.getStatus(),
                        p.getDepartmentId(),
                        departmentNames.get(p.getDepartmentId()),
                        leadsByDepartment.getOrDefault(p.getDepartmentId(), List.of()),
                        employeesByProject.getOrDefault(p.getId(), List.of()),
                        taskCounts.getOrDefault(p.getId(), 0L),
                        completedCounts.getOrDefault(p.getId(), 0L),
                        p.getCreatedAt()))
                .sorted(Comparator
                        .comparing((AdminProjectResponse r) -> r.departmentName() == null ? "" : r.departmentName(),
                                String.CASE_INSENSITIVE_ORDER)
                        .thenComparing(AdminProjectResponse::name, String.CASE_INSENSITIVE_ORDER))
                .toList();
    }
}
