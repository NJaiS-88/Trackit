package com.trackit.repository;

import com.trackit.model.Incident;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface IncidentRepository extends MongoRepository<Incident, String> {

    Optional<Incident> findByIncidentNumber(String number);

    Page<Incident> findByCreatedBy(String userId, Pageable pageable);

    Page<Incident> findByAssignedTo(String userId, Pageable pageable);

    Optional<Incident> findTopByOrderByIncidentNumberDesc();
}
