package com.trackit.service;

import com.trackit.config.SlaProperties;
import com.trackit.model.Incident;
import com.trackit.model.enums.IncidentStatus;
import com.trackit.model.enums.Priority;
import com.trackit.model.enums.SlaStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.EnumSet;
import java.util.Objects;
import java.util.Set;

/**
 * SLA rules for incidents. The deadline is {@code createdAt + target(priority) + time paused}; the clock pauses
 * while an incident is On Hold and stops while it is Resolved or Closed (reopening resumes it).
 * Callers change the incident, call one of these methods, then save.
 */
@Service
@RequiredArgsConstructor
public class SlaService {

    /** Statuses in which the SLA clock is not running. */
    public static final Set<IncidentStatus> CLOCK_STOPPED =
            EnumSet.of(IncidentStatus.ON_HOLD, IncidentStatus.RESOLVED, IncidentStatus.CLOSED);

    /** Statuses in which the SLA clock is running. */
    public static final Set<IncidentStatus> CLOCK_RUNNING = EnumSet.complementOf(EnumSet.copyOf(CLOCK_STOPPED));

    private final SlaProperties properties;

    /**
     * Starts tracking an incident: new ones, or ones created before SLAs existed. For an existing incident that
     * is already paused or resolved, its last update is taken as the moment the clock stopped.
     */
    public void initialize(Incident incident, Instant now) {
        boolean stopped = CLOCK_STOPPED.contains(incident.getStatus());
        Instant stoppedAt = incident.getUpdatedAt() != null ? incident.getUpdatedAt() : now;
        incident.setSlaPausedMillis(0);
        incident.setSlaPausedAt(stopped ? stoppedAt : null);
        if (isResolved(incident.getStatus()) && incident.getResolvedAt() == null) {
            incident.setResolvedAt(stoppedAt);
        }
        recalculateDeadline(incident);
        refreshStatus(incident, now);
    }

    /** Call after setting the incident's new status, before saving. */
    public void onStatusChange(Incident incident, IncidentStatus from, Instant now) {
        if (incident.getDueAt() == null) {
            initialize(incident, now);
            return;
        }
        IncidentStatus to = incident.getStatus();
        boolean wasStopped = CLOCK_STOPPED.contains(from);
        boolean stopped = CLOCK_STOPPED.contains(to);
        if (!wasStopped && stopped) {
            incident.setSlaPausedAt(now);
        } else if (wasStopped && !stopped) {
            resume(incident, now);
        }
        if (to == IncidentStatus.RESOLVED) {
            incident.setResolvedAt(now);
        }
        refreshStatus(incident, now);
    }

    /** Call after the priority changes, so the deadline follows the new target. */
    public void onPriorityChange(Incident incident, Instant now) {
        if (incident.getDueAt() == null) {
            initialize(incident, now);
            return;
        }
        recalculateDeadline(incident);
        refreshStatus(incident, now);
    }

    /** Stores the status as of {@code now}; the scheduler calls this as time passes. */
    public void refreshStatus(Incident incident, Instant now) {
        incident.setSlaStatus(statusAt(incident, now));
    }

    /** The SLA status at {@code now}, worked out from the deadline. Pure: does not modify the incident. */
    public SlaStatus statusAt(Incident incident, Instant now) {
        Instant dueAt = incident.getDueAt();
        if (dueAt == null) {
            return incident.getSlaStatus();
        }
        if (isResolved(incident.getStatus())) {
            Instant resolvedAt = Objects.requireNonNullElse(incident.getResolvedAt(), now);
            return resolvedAt.isAfter(dueAt) ? SlaStatus.BREACHED : SlaStatus.MET;
        }
        // While On Hold the status is frozen at the moment the clock paused
        Instant clock = incident.getSlaPausedAt() != null ? incident.getSlaPausedAt() : now;
        if (clock.isAfter(dueAt)) {
            return SlaStatus.BREACHED;
        }
        if (incident.getSlaWarningAt() != null && !clock.isBefore(incident.getSlaWarningAt())) {
            return SlaStatus.DUE_SOON;
        }
        return SlaStatus.NORMAL;
    }

    private void resume(Incident incident, Instant now) {
        Instant pausedAt = incident.getSlaPausedAt();
        if (pausedAt != null && now.isAfter(pausedAt)) {
            incident.setSlaPausedMillis(incident.getSlaPausedMillis() + Duration.between(pausedAt, now).toMillis());
        }
        incident.setSlaPausedAt(null);
        recalculateDeadline(incident);
    }

    private void recalculateDeadline(Incident incident) {
        Priority priority = Objects.requireNonNullElse(incident.getPriority(), Priority.P3);
        Instant dueAt = incident.getCreatedAt()
                .plus(properties.resolutionTarget(priority))
                .plusMillis(incident.getSlaPausedMillis());
        incident.setDueAt(dueAt);
        incident.setSlaWarningAt(dueAt.minus(properties.dueSoonWindow(priority)));
    }

    private static boolean isResolved(IncidentStatus status) {
        return status == IncidentStatus.RESOLVED || status == IncidentStatus.CLOSED;
    }
}
