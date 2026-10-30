package com.trackit.dto;

import com.trackit.model.Project;
import com.trackit.model.enums.ProjectStatus;

import java.time.Instant;

public record ProjectResponse(
        String id,
        String name,
        ProjectStatus status,
        Instant createdAt
) {

    public static ProjectResponse from(Project project) {
        ProjectStatus status = project.getStatus() == null ? ProjectStatus.ACTIVE : project.getStatus();
        return new ProjectResponse(project.getId(), project.getName(), status, project.getCreatedAt());
    }
}
