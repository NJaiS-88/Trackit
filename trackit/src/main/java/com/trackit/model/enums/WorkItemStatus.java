package com.trackit.model.enums;

import java.util.Set;

public enum WorkItemStatus {
    ASSIGNED,
    IN_PROGRESS,
    COMPLETED,
    /** The employee could not do it and gave a reason; the Lead reassigns it. */
    DECLINED;

    /** Statuses in which the work still needs doing. */
    public static final Set<WorkItemStatus> OPEN = Set.of(ASSIGNED, IN_PROGRESS, DECLINED);
}
