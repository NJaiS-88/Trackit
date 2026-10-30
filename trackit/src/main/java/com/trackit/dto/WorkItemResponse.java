package com.trackit.dto;

import com.trackit.model.enums.Priority;
import com.trackit.model.enums.WorkItemStatus;
import com.trackit.model.enums.WorkItemType;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;

/**
 * A work item with every referenced name resolved. Project fields are set for project tasks;
 * ticket fields ({@code incident*}, {@code priority}) for tickets.
 */
public record WorkItemResponse(
        String id,
        WorkItemType type,
        String title,
        String description,
        WorkItemStatus status,
        String departmentId,
        String departmentName,
        String projectId,
        String projectName,
        String incidentId,
        String incidentNumber,
        Priority priority,
        String assigneeId,
        String assigneeName,
        String assignedByName,
        LocalDate dueDate,
        LocalTime dueTime,
        String declineReason,
        Instant createdAt,
        Instant updatedAt,
        Instant completedAt
) {
}
