package com.trackit.model;

import com.trackit.model.enums.WorkItemStatus;
import com.trackit.model.enums.WorkItemType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Version;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

/**
 * A piece of work a Lead gave to an employee in their department: a project task or a ticket.
 * Indexes are declared in {@link com.trackit.config.MongoConfig}.
 */
@Document(collection = "work_items")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkItem {

    @Id
    private String id;

    private WorkItemType type;

    private String title;

    private String description;

    private String departmentId;

    /** Set for {@link WorkItemType#PROJECT_TASK}. */
    private String projectId;

    /** Set for {@link WorkItemType#TICKET}. */
    private String incidentId;

    /** Employee doing the work. */
    private String assignedTo;

    /** Lead who assigned it. */
    private String assignedBy;

    @Builder.Default
    private WorkItemStatus status = WorkItemStatus.ASSIGNED;

    private LocalDate dueDate;

    /** Optional time of day on {@link #dueDate}; without it the work is due by the end of that day. */
    private LocalTime dueTime;

    /** GridFS ids of reference files the Lead attached; shared by every copy of the same task. */
    @Builder.Default
    private List<String> attachmentIds = new ArrayList<>();

    /** Why the employee could not do it; set while {@link WorkItemStatus#DECLINED}. */
    private String declineReason;

    private Instant createdAt;

    /** When the current assignee got the work; resets on reassignment. Due-soon alerts measure from here. */
    private Instant assignedAt;

    private Instant updatedAt;

    private Instant completedAt;

    /** Concurrent actions (e.g. employee completes while the Lead reassigns) can't silently overwrite each other. */
    @Version
    private Long version;
}
