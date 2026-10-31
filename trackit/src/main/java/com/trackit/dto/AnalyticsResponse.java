package com.trackit.dto;

import com.trackit.model.enums.Priority;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * Admin analytics. "InRange" figures cover the last {@code rangeDays} days; everything else is the state now.
 * Rates are percentages (0–100, one decimal) and are null when there is nothing to measure yet.
 */
public record AnalyticsResponse(
        int rangeDays,
        Instant generatedAt,
        IncidentStats incidents,
        List<TrendPoint> trend,
        WorkStats work,
        ProjectStats projects,
        PeopleStats people,
        List<DepartmentStats> departments
) {

    public record IncidentStats(
            long open,
            long openBreached,
            long createdInRange,
            long resolvedInRange,
            long slaMetInRange,
            long slaBreachedInRange,
            Double slaCompliancePercent,
            Double avgResolutionHours,
            Map<Priority, Long> openByPriority
    ) {
    }

    /** Incidents raised and resolved in the bucket starting on {@code start} ({@code days} long). */
    public record TrendPoint(LocalDate start, int days, long created, long resolved) {
    }

    public record WorkStats(
            long assigned,
            long inProgress,
            long declined,
            long overdue,
            long assignedInRange,
            long completedInRange,
            Double onTimePercent
    ) {
    }

    public record ProjectStats(long active, long onHold, long completed) {
    }

    public record PeopleStats(long employees, long leads, long admins, long inactive, long pendingRequests) {
    }

    public record DepartmentStats(
            String id,
            String name,
            List<String> leads,
            long employees,
            long openTickets,
            long activeProjects,
            long openWork,
            long overdueWork,
            long completedInRange,
            Double onTimePercent
    ) {
    }
}
