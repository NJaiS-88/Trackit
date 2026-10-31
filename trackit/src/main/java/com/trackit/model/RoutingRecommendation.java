package com.trackit.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/**
 * The AI's suggestion of which department should handle a ticket, stored on the {@link Incident}.
 * Advice only: a Lead decides whether to pass the ticket.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoutingRecommendation {

    private String departmentId;

    private String departmentName;

    /** HIGH, MEDIUM or LOW. */
    private String confidence;

    private String reason;

    /** True when it recommends the department that was handling the ticket at the time. */
    private boolean stay;

    /** Department handling the ticket when this was generated; once the ticket is passed it is out of date. */
    private String forDepartmentId;

    /** The model that made the recommendation, e.g. {@code typesafe/jev-router}. */
    private String model;

    private Instant generatedAt;
}
