package com.trackit.model;

import com.trackit.model.enums.Impact;
import com.trackit.model.enums.IncidentStatus;
import com.trackit.model.enums.Priority;
import com.trackit.model.enums.SlaStatus;
import com.trackit.model.enums.Urgency;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Version;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/** Indexes are declared in {@link com.trackit.config.MongoConfig}. */
@Document(collection = "incidents")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Incident {

    @Id
    private String id;

    /** Human-readable id, e.g. {@code INC-2026-000001}. */
    private String incidentNumber;

    private String title;

    private String description;

    /** Name of a {@link com.trackit.model.enums.Category} constant. */
    private String category;

    private String affectedService;

    private Impact impact;

    private Urgency urgency;

    @Builder.Default
    private Priority priority = Priority.P3;

    @Builder.Default
    private IncidentStatus status = IncidentStatus.OPEN;

    @Builder.Default
    private SlaStatus slaStatus = SlaStatus.NORMAL;

    /** User id of the reporter. */
    private String createdBy;

    /** User id of the assigned engineer; null until assigned. */
    private String assignedTo;

    private Instant createdAt;

    private Instant updatedAt;

    /** SLA deadline: createdAt + target for the priority + time spent paused. */
    private Instant dueAt;

    /** When the incident turns "due soon"; stored so the SLA job can query it. */
    private Instant slaWarningAt;

    /** When the SLA clock was paused (On Hold or Resolved); null while it runs. */
    private Instant slaPausedAt;

    /** Total time the clock has been paused, already added to {@link #dueAt}. */
    private long slaPausedMillis;

    /** When the incident was last resolved. */
    private Instant resolvedAt;

    /** AI suggestion of which department should handle the ticket; null until generated. */
    private RoutingRecommendation routingRecommendation;

    /** False once soft-deleted by an admin. */
    @Builder.Default
    private boolean active = true;

    /** Optimistic lock so concurrent edits/assignments can't silently overwrite each other. */
    @Version
    private Long version;
}
