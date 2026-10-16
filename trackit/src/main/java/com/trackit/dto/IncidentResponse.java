package com.trackit.dto;

import com.trackit.model.enums.Impact;
import com.trackit.model.enums.IncidentStatus;
import com.trackit.model.enums.Priority;
import com.trackit.model.enums.SlaStatus;
import com.trackit.model.enums.Urgency;

import java.time.Instant;

public record IncidentResponse(
        String id,
        String incidentNumber,
        String title,
        String description,
        String category,
        String affectedService,
        Impact impact,
        Urgency urgency,
        Priority priority,
        String priorityLabel,
        IncidentStatus status,
        SlaStatus slaStatus,
        String createdBy,
        String createdByName,
        String assignedTo,
        String assignedToName,
        Instant createdAt,
        Instant updatedAt,
        Instant dueAt
) {
}
