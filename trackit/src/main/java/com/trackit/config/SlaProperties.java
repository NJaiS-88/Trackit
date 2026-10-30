package com.trackit.config;

import com.trackit.model.enums.Priority;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.validation.annotation.Validated;

import java.time.Duration;

/**
 * Service-level targets. Calendar time; the clock pauses while an incident is On Hold.
 *
 * @param resolution     time allowed to resolve an incident, per priority
 * @param dueSoonPercent an incident counts as "due soon" once this share of its target time is left
 */
@Validated
@ConfigurationProperties(prefix = "trackit.sla")
public record SlaProperties(
        @DefaultValue @Valid Resolution resolution,
        @DefaultValue("20") @Min(1) @Max(99) int dueSoonPercent
) {

    public record Resolution(
            @DefaultValue("4h") @NotNull Duration p1,
            @DefaultValue("8h") @NotNull Duration p2,
            @DefaultValue("3d") @NotNull Duration p3,
            @DefaultValue("5d") @NotNull Duration p4
    ) {
    }

    public Duration resolutionTarget(Priority priority) {
        return switch (priority) {
            case P1 -> resolution.p1();
            case P2 -> resolution.p2();
            case P3 -> resolution.p3();
            case P4 -> resolution.p4();
        };
    }

    /** How long before the deadline an incident becomes "due soon". */
    public Duration dueSoonWindow(Priority priority) {
        return resolutionTarget(priority).multipliedBy(dueSoonPercent).dividedBy(100);
    }
}
