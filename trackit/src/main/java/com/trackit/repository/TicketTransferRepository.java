package com.trackit.repository;

import com.trackit.model.TicketTransfer;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Collection;
import java.util.List;

public interface TicketTransferRepository extends MongoRepository<TicketTransfer, String> {

    /** A ticket's routing history, oldest first. */
    List<TicketTransfer> findByIncidentIdOrderByCreatedAtAsc(String incidentId);

    /** Latest passes first, for showing "passed from" on several tickets at once. */
    List<TicketTransfer> findByIncidentIdInOrderByCreatedAtDesc(Collection<String> incidentIds);
}
