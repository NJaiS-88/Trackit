package com.trackit.controller;

import com.trackit.dto.AnalyticsResponse;
import com.trackit.dto.TeamAnalyticsResponse;
import com.trackit.security.CurrentUser;
import com.trackit.service.AnalyticsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.DateTimeException;
import java.time.ZoneId;
import java.time.ZoneOffset;

@RestController
@RequiredArgsConstructor
@Tag(name = "Analytics", description = "Incident, SLA, work and department analytics")
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    /** A Lead's own department, broken down by employee and project. Same {@code days} and {@code tz} as below. */
    @GetMapping("/api/team/analytics")
    @PreAuthorize("hasRole('ENGINEER')")
    @Operation(summary = "Analytics for the Lead's own department for the last 7, 30 or 90 days")
    public TeamAnalyticsResponse getTeamAnalytics(@RequestParam(defaultValue = "30") int days,
                                                  @RequestParam(required = false) String tz) {
        requireSupportedRange(days);
        return analyticsService.getTeamAnalytics(CurrentUser.get().id(), days, zoneOf(tz));
    }

    /**
     * {@code tz} is the admin's IANA time zone (e.g. Asia/Kolkata), so days start at their midnight.
     * {@code departmentId} limits the figures to one department; omit it for all departments.
     */
    @GetMapping("/api/admin/analytics")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Analytics for the last 7, 30 or 90 days, for all departments or one")
    public AnalyticsResponse getAnalytics(@RequestParam(defaultValue = "30") int days,
                                          @RequestParam(required = false) String tz,
                                          @RequestParam(required = false) String departmentId) {
        requireSupportedRange(days);
        String department = departmentId == null || departmentId.isBlank() ? null : departmentId.trim();
        return analyticsService.getAnalytics(days, zoneOf(tz), department);
    }

    private static void requireSupportedRange(int days) {
        if (!AnalyticsService.SUPPORTED_RANGES.contains(days)) {
            throw new IllegalArgumentException("days must be 7, 30 or 90");
        }
    }

    private static ZoneId zoneOf(String tz) {
        if (tz == null || tz.isBlank()) {
            return ZoneOffset.UTC;
        }
        try {
            return ZoneId.of(tz);
        } catch (DateTimeException e) {
            return ZoneOffset.UTC;
        }
    }
}
