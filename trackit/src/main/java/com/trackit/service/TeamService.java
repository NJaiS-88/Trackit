package com.trackit.service;

import com.trackit.dto.CreateProjectRequest;
import com.trackit.dto.ProjectResponse;
import com.trackit.dto.TeamMemberResponse;
import com.trackit.dto.TeamResponse;
import com.trackit.exception.ProjectAlreadyExistsException;
import com.trackit.exception.ResourceNotFoundException;
import com.trackit.exception.UnauthorizedException;
import com.trackit.exception.WorkflowViolationException;
import com.trackit.model.Department;
import com.trackit.model.Project;
import com.trackit.model.Role;
import com.trackit.model.User;
import com.trackit.model.enums.ProjectStatus;
import com.trackit.repository.DepartmentRepository;
import com.trackit.repository.ProjectRepository;
import com.trackit.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Objects;

/** A Lead manages only their own department: its employees and projects. The department itself is admin-set. */
@Service
@RequiredArgsConstructor
public class TeamService {

    private final UserRepository userRepository;
    private final DepartmentRepository departmentRepository;
    private final ProjectRepository projectRepository;

    public TeamResponse getTeam(String leadId) {
        String departmentId = findLead(leadId).getDepartmentId();
        if (departmentId == null) {
            return new TeamResponse(null, null, List.of(), List.of());
        }
        String departmentName = departmentRepository.findById(departmentId).map(Department::getName).orElse(null);
        List<TeamMemberResponse> members = userRepository
                .findByDepartmentIdAndRoleAndActiveTrueOrderByNameAsc(departmentId, Role.EMPLOYEE).stream()
                .map(TeamMemberResponse::from)
                .toList();
        List<ProjectResponse> projects = projectRepository.findByDepartmentIdOrderByNameAsc(departmentId).stream()
                .map(ProjectResponse::from)
                .toList();
        return new TeamResponse(departmentId, departmentName, members, projects);
    }

    public ProjectResponse createProject(String leadId, CreateProjectRequest request) {
        String departmentId = requireDepartment(findLead(leadId));
        String name = request.name().trim().replaceAll("\\s+", " ");
        String nameKey = name.toLowerCase(Locale.ROOT);
        if (projectRepository.existsByDepartmentIdAndNameKey(departmentId, nameKey)) {
            throw new ProjectAlreadyExistsException(name);
        }

        Project project = Project.builder()
                .name(name)
                .nameKey(nameKey)
                .departmentId(departmentId)
                .status(ProjectStatus.ACTIVE)
                .createdAt(Instant.now())
                .createdBy(leadId)
                .build();
        try {
            return ProjectResponse.from(projectRepository.save(project));
        } catch (DuplicateKeyException e) {
            throw new ProjectAlreadyExistsException(name);
        }
    }

    /** {@code projectId} null or blank clears the employee's project. */
    public TeamMemberResponse assignProject(String leadId, String memberId, String projectId) {
        String departmentId = requireDepartment(findLead(leadId));
        User member = userRepository.findById(memberId)
                .filter(u -> u.isActive() && u.getRole() == Role.EMPLOYEE)
                .filter(u -> departmentId.equals(u.getDepartmentId()))
                .orElseThrow(() -> new UnauthorizedException("This employee is not in your department"));

        String newProjectId = StringUtils.hasText(projectId) ? projectId.trim() : null;
        if (Objects.equals(member.getProjectId(), newProjectId)) {
            return TeamMemberResponse.from(member);
        }
        if (newProjectId != null) {
            Project project = findDepartmentProject(departmentId, newProjectId);
            if (project.getStatus() == ProjectStatus.COMPLETED) {
                throw new WorkflowViolationException("Employees cannot be assigned to a completed project");
            }
        }
        member.setProjectId(newProjectId);
        return TeamMemberResponse.from(userRepository.save(member));
    }

    public ProjectResponse updateProjectStatus(String leadId, String projectId, ProjectStatus status) {
        String departmentId = requireDepartment(findLead(leadId));
        Project project = findDepartmentProject(departmentId, projectId);
        if (project.getStatus() != status) {
            project.setStatus(status);
            project = projectRepository.save(project);
        }
        return ProjectResponse.from(project);
    }

    private Project findDepartmentProject(String departmentId, String projectId) {
        return projectRepository.findById(projectId)
                .filter(p -> departmentId.equals(p.getDepartmentId()))
                .orElseThrow(() -> new ResourceNotFoundException("Project", "id", projectId));
    }

    private User findLead(String leadId) {
        return userRepository.findById(leadId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", leadId));
    }

    private static String requireDepartment(User lead) {
        if (lead.getDepartmentId() == null) {
            throw new WorkflowViolationException("You have not been assigned to a department yet");
        }
        return lead.getDepartmentId();
    }
}
