package com.trackit.dto;

import com.trackit.model.enums.IncidentStatus;
import com.trackit.model.enums.Priority;
import com.trackit.model.enums.SlaStatus;

import java.time.Instant;
import java.util.List;

/** An unresolved ticket raised in the Lead's department, with every employee assigned to it. */
public record TeamTicketResponse(
        String id,
        String incidentNumber,
        String title,
        String description,
        String category,
        Priority priority,
        String priorityLabel,
        IncidentStatus status,
        SlaStatus slaStatus,
        Instant dueAt,
        String reporterName,
        Instant createdAt,
        List<TicketAssigneeResponse> assignees
) {
}
