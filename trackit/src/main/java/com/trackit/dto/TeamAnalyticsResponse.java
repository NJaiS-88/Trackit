package com.trackit.dto;

import com.trackit.model.enums.ProjectStatus;

import java.time.Instant;
import java.util.List;

/**
 * A Lead's view of their own department: the department-wide figures plus a breakdown per employee and per
 * project. "InRange" figures cover the selected period; rates are percentages and null when nothing to measure.
 */
public record TeamAnalyticsResponse(
        AnalyticsResponse overview,
        List<EmployeeStats> employees,
        List<ProjectProgress> projects
) {

    public record EmployeeStats(
            String id,
            String name,
            String projectName,
            long assigned,
            long inProgress,
            long overdue,
            long declined,
            long completedInRange,
            Double onTimePercent,
            Double avgCompletionHours
    ) {
    }

    /** {@code nextDeadline} is the earliest deadline among the project's open tasks. */
    public record ProjectProgress(
            String id,
            String name,
            ProjectStatus status,
            long members,
            long tasks,
            long completed,
            long open,
            long overdue,
            Double completionPercent,
            Instant nextDeadline
    ) {
    }
}
