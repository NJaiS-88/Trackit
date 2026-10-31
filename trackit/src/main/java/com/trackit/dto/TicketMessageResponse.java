package com.trackit.dto;

import java.time.Instant;

/**
 * @param authorRole whether the sender reported the ticket or was assigned to it (possibly earlier)
 */
public record TicketMessageResponse(
        String id,
        String authorId,
        String authorName,
        AuthorRole authorRole,
        String body,
        Instant createdAt
) {

    public enum AuthorRole {
        REPORTER,
        ASSIGNEE
    }
}
