package com.trackit.dto;

import com.trackit.model.enums.IncidentStatus;
import com.trackit.model.enums.Priority;
import com.trackit.model.enums.SlaStatus;

import java.time.Instant;

public record IncidentSummaryResponse(
        String id,
        String incidentNumber,
        String title,
        String category,
        Priority priority,
        String priorityLabel,
        IncidentStatus status,
        SlaStatus slaStatus,
        Instant createdAt,
        String assignedToName
) {
}
