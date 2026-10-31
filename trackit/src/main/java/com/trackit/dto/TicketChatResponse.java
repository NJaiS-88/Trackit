package com.trackit.dto;

import java.util.List;

/**
 * A ticket's whole conversation, oldest first.
 *
 * @param canPost              whether the caller may send a message now
 * @param postingDisabledReason why not, when {@code canPost} is false (e.g. Leads only read, or the ticket is closed)
 */
public record TicketChatResponse(
        boolean canPost,
        String postingDisabledReason,
        List<TicketMessageResponse> messages
) {
}
