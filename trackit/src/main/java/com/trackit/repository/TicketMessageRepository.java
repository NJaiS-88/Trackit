package com.trackit.repository;

import com.trackit.model.TicketMessage;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface TicketMessageRepository extends MongoRepository<TicketMessage, String> {

    /** The ticket's whole conversation, oldest first. */
    List<TicketMessage> findByIncidentIdOrderByCreatedAtAsc(String incidentId);
}
