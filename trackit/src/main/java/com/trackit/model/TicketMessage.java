package com.trackit.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/**
 * A chat message on a ticket between its reporter and the employees assigned to it. Messages belong to the
 * ticket, not to an assignment, so the history stays when the ticket is reassigned. Messages are never edited.
 * Indexes are declared in {@link com.trackit.config.MongoConfig}.
 */
@Document(collection = "ticket_messages")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TicketMessage {

    @Id
    private String id;

    /** The {@link Incident} this message is about. */
    private String incidentId;

    /** User id of the sender: the reporter or an assigned employee. */
    private String authorId;

    private String body;

    private Instant createdAt;
}
