package com.trackit.dto;

import com.trackit.model.enums.WorkItemStatus;

/** One employee working on a ticket, and how far they've got. */
public record TicketAssigneeResponse(
        String workItemId,
        String assigneeId,
        String name,
        WorkItemStatus status
) {
}
