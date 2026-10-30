package com.trackit.dto;

import com.trackit.model.enums.ProjectStatus;

import java.time.Instant;
import java.util.List;

/**
 * A project as seen by an admin. {@code leads} are the department's active Leads;
 * {@code employees} are the active employees assigned to the project.
 */
public record AdminProjectResponse(
        String id,
        String name,
        ProjectStatus status,
        String departmentId,
        String departmentName,
        List<String> leads,
        List<String> employees,
        Instant createdAt
) {
}
