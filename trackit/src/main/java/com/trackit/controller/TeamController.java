package com.trackit.controller;

import com.trackit.dto.CreateProjectRequest;
import com.trackit.dto.ProjectResponse;
import com.trackit.dto.TeamMemberResponse;
import com.trackit.dto.TeamResponse;
import com.trackit.dto.UpdateProjectRequest;
import com.trackit.dto.UpdateProjectStatusRequest;
import com.trackit.security.CurrentUser;
import com.trackit.service.TeamService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/team")
@RequiredArgsConstructor
@Tag(name = "Team", description = "A Lead's own department: its employees and projects")
public class TeamController {

    private final TeamService teamService;

    @GetMapping
    @PreAuthorize("hasRole('ENGINEER')")
    @Operation(summary = "The Lead's department, its active employees and its projects")
    public TeamResponse getTeam() {
        return teamService.getTeam(CurrentUser.get().id());
    }

    @PostMapping("/projects")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ENGINEER')")
    @Operation(summary = "Create a project in the Lead's department")
    public ProjectResponse createProject(@Valid @RequestBody CreateProjectRequest request) {
        return teamService.createProject(CurrentUser.get().id(), request);
    }

    @PatchMapping("/projects/{id}/status")
    @PreAuthorize("hasRole('ENGINEER')")
    @Operation(summary = "Change the status of a project in the Lead's department")
    public ProjectResponse updateProjectStatus(@PathVariable String id,
                                               @Valid @RequestBody UpdateProjectStatusRequest request) {
        return teamService.updateProjectStatus(CurrentUser.get().id(), id, request.status());
    }

    @PatchMapping("/members/{id}/project")
    @PreAuthorize("hasRole('ENGINEER')")
    @Operation(summary = "Assign an employee in the Lead's department to a project (send null to clear it)")
    public TeamMemberResponse assignProject(@PathVariable String id, @RequestBody UpdateProjectRequest request) {
        return teamService.assignProject(CurrentUser.get().id(), id, request.projectId());
    }
}
