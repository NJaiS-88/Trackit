package com.trackit.dto;

import java.time.Instant;

/** One pass of a ticket between departments, with names resolved for display. */
public record TicketTransferResponse(
        String id,
        String fromDepartmentId,
        String fromDepartmentName,
        String toDepartmentId,
        String toDepartmentName,
        String passedByName,
        String note,
        boolean followedRecommendation,
        Instant createdAt
) {
}
