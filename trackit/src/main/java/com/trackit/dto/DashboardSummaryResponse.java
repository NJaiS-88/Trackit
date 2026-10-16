package com.trackit.dto;

public record DashboardSummaryResponse(
        long open,
        long inProgress,
        long resolved,
        long slaBreached
) {
}
