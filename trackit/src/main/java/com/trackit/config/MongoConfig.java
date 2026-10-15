package com.trackit.config;

import com.trackit.model.Incident;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.event.EventListener;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.Index;
import org.springframework.data.mongodb.core.index.IndexOperations;

/** Creates collection indexes at startup; index creation is idempotent. */
@Configuration
@RequiredArgsConstructor
public class MongoConfig {

    private final MongoTemplate mongoTemplate;

    @EventListener(ApplicationReadyEvent.class)
    public void ensureIndexes() {
        IndexOperations incidents = mongoTemplate.indexOps(Incident.class);
        incidents.ensureIndex(new Index().on("incidentNumber", Sort.Direction.ASC).unique());
        incidents.ensureIndex(new Index().on("createdBy", Sort.Direction.ASC));
        incidents.ensureIndex(new Index().on("assignedTo", Sort.Direction.ASC));
        incidents.ensureIndex(new Index().on("status", Sort.Direction.ASC));
        incidents.ensureIndex(new Index().on("priority", Sort.Direction.ASC));
        incidents.ensureIndex(new Index().on("category", Sort.Direction.ASC));
        incidents.ensureIndex(new Index().on("createdAt", Sort.Direction.DESC));
    }
}
