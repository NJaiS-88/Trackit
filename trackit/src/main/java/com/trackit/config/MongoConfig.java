package com.trackit.config;

import com.trackit.model.AccountRequest;
import com.trackit.model.Department;
import com.trackit.model.Incident;
import com.trackit.model.Project;
import com.trackit.model.TicketMessage;
import com.trackit.model.User;
import com.trackit.model.WorkItem;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.event.EventListener;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.Index;
import org.springframework.data.mongodb.core.index.IndexOperations;
import org.springframework.data.mongodb.core.index.PartialIndexFilter;
import org.springframework.data.mongodb.core.query.Criteria;

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
        // The SLA job looks up running incidents whose warning time or deadline has passed
        incidents.ensureIndex(new Index().on("slaStatus", Sort.Direction.ASC).on("slaWarningAt", Sort.Direction.ASC));
        incidents.ensureIndex(new Index().on("slaStatus", Sort.Direction.ASC).on("dueAt", Sort.Direction.ASC));

        IndexOperations accountRequests = mongoTemplate.indexOps(AccountRequest.class);
        // At most one pending request per email; reviewed requests are kept as history
        accountRequests.ensureIndex(new Index().on("email", Sort.Direction.ASC).unique()
                .named("email_pending_unique")
                .partial(PartialIndexFilter.of(Criteria.where("status").is("PENDING"))));
        accountRequests.ensureIndex(new Index().on("email", Sort.Direction.ASC).on("createdAt", Sort.Direction.DESC));
        accountRequests.ensureIndex(new Index().on("status", Sort.Direction.ASC).on("createdAt", Sort.Direction.DESC));

        IndexOperations departments = mongoTemplate.indexOps(Department.class);
        departments.ensureIndex(new Index().on("nameKey", Sort.Direction.ASC).unique());
        departments.ensureIndex(new Index().on("name", Sort.Direction.ASC));

        IndexOperations projects = mongoTemplate.indexOps(Project.class);
        projects.ensureIndex(new Index().on("departmentId", Sort.Direction.ASC).on("nameKey", Sort.Direction.ASC)
                .unique());

        IndexOperations users = mongoTemplate.indexOps(User.class);
        users.ensureIndex(new Index().on("departmentId", Sort.Direction.ASC));
        // Partial, so users still waiting for the startup backfill don't collide as duplicate "missing" values
        users.ensureIndex(new Index().on("employeeId", Sort.Direction.ASC).unique()
                .named("employeeId_unique")
                .partial(PartialIndexFilter.of(Criteria.where("employeeId").exists(true))));

        IndexOperations workItems = mongoTemplate.indexOps(WorkItem.class);
        workItems.ensureIndex(new Index().on("departmentId", Sort.Direction.ASC).on("createdAt", Sort.Direction.DESC));
        workItems.ensureIndex(new Index().on("assignedTo", Sort.Direction.ASC).on("createdAt", Sort.Direction.DESC));
        workItems.ensureIndex(new Index().on("incidentId", Sort.Direction.ASC));
        workItems.ensureIndex(new Index().on("projectId", Sort.Direction.ASC));
        workItems.ensureIndex(new Index().on("attachmentIds", Sort.Direction.ASC));

        mongoTemplate.indexOps(TicketMessage.class)
                .ensureIndex(new Index().on("incidentId", Sort.Direction.ASC).on("createdAt", Sort.Direction.ASC));
    }
}
