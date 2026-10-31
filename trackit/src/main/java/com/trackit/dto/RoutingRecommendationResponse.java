package com.trackit.dto;

import com.trackit.model.RoutingRecommendation;

import java.time.Instant;

/**
 * The AI's suggestion of which department should handle a ticket. Advice only: a Lead decides.
 * {@code stay} means it recommends the department that was handling the ticket when it was generated.
 * {@code handoffNote} is a draft the Lead can edit and send when passing; null when staying.
 */
public record RoutingRecommendationResponse(
        String departmentId,
        String departmentName,
        String confidence,
        String reason,
        boolean stay,
        String model,
        Instant generatedAt,
        String handoffNote
) {

    /** Null when the ticket has no recommendation yet. */
    public static RoutingRecommendationResponse from(RoutingRecommendation recommendation) {
        if (recommendation == null) {
            return null;
        }
        return new RoutingRecommendationResponse(
                recommendation.getDepartmentId(),
                recommendation.getDepartmentName(),
                recommendation.getConfidence(),
                recommendation.getReason(),
                recommendation.isStay(),
                recommendation.getModel(),
                recommendation.getGeneratedAt(),
                recommendation.getHandoffNote());
    }
}
