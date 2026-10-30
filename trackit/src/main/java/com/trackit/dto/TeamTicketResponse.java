package com.trackit.dto;

import com.trackit.model.enums.IncidentStatus;
import com.trackit.model.enums.Priority;
import com.trackit.model.enums.WorkItemStatus;

import java.time.Instant;

/** An unresolved ticket raised in the Lead's department, with the open work item handling it (if any). */
public record TeamTicketResponse(
        String id,
        String incidentNumber,
        String title,
        String description,
        String category,
        Priority priority,
        String priorityLabel,
        IncidentStatus status,
        String reporterName,
        Instant createdAt,
        String workItemId,
        String workAssigneeName,
        WorkItemStatus workStatus
) {
}
