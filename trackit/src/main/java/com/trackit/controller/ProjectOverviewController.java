package com.trackit.controller;

import com.trackit.dto.AdminProjectResponse;
import com.trackit.service.ProjectOverviewService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/projects")
@RequiredArgsConstructor
@Tag(name = "Projects", description = "Admin overview of every department's projects")
public class ProjectOverviewController {

    private final ProjectOverviewService projectOverviewService;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "All projects with their department, Leads, assigned employees and status")
    public List<AdminProjectResponse> getProjects() {
        return projectOverviewService.getProjects();
    }
}
