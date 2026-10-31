package com.trackit.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/** One time a Lead passed a ticket to another department. A ticket's transfers, oldest first, are its routing history. */
@Document(collection = "ticket_transfers")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TicketTransfer {

    @Id
    private String id;

    @Indexed
    private String incidentId;

    private String fromDepartmentId;

    private String toDepartmentId;

    /** User id of the Lead who passed it. */
    private String passedBy;

    /** Why the Lead passed it; shown to the receiving Lead. */
    private String note;

    /** True when the Lead sent it where the AI recommended. */
    private boolean followedRecommendation;

    private Instant createdAt;
}
