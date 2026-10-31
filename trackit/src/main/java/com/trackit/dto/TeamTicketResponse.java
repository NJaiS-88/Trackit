package com.trackit.dto;

import com.trackit.model.enums.IncidentStatus;
import com.trackit.model.enums.Priority;
import com.trackit.model.enums.SlaStatus;

import java.time.Instant;
import java.util.List;

/**
 * An unresolved ticket raised in the Lead's department, with every employee assigned to it and the AI's
 * department recommendation ({@code routingRecommendation} is null until one has been generated).
 */
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
        List<TicketAssigneeResponse> assignees,
        RoutingRecommendationResponse routingRecommendation,
        // The most recent pass between departments, e.g. how it reached this Lead; null if never passed
        TicketTransferResponse lastTransfer
) {
}
