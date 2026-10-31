package com.trackit.controller;

import com.trackit.dto.AnalyticsResponse;
import com.trackit.service.AnalyticsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.DateTimeException;
import java.time.ZoneId;
import java.time.ZoneOffset;

@RestController
@RequestMapping("/api/admin/analytics")
@RequiredArgsConstructor
@Tag(name = "Analytics", description = "Admin overview of incidents, SLA, work and departments")
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    /** {@code tz} is the admin's IANA time zone (e.g. Asia/Kolkata), so days start at their midnight. */
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Analytics for the last 7, 30 or 90 days")
    public AnalyticsResponse getAnalytics(@RequestParam(defaultValue = "30") int days,
                                          @RequestParam(required = false) String tz) {
        if (!AnalyticsService.SUPPORTED_RANGES.contains(days)) {
            throw new IllegalArgumentException("days must be 7, 30 or 90");
        }
        return analyticsService.getAnalytics(days, zoneOf(tz));
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
