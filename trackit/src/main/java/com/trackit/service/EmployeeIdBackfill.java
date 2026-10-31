package com.trackit.service;

import com.trackit.model.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Component;

import java.util.List;

/** Gives users created before employee ids existed an id at startup, oldest account first. */
@Slf4j
@Component
@RequiredArgsConstructor
public class EmployeeIdBackfill {

    private final MongoTemplate mongoTemplate;
    private final EmployeeIdService employeeIdService;

    // Runs before the admin bootstrap, so existing accounts keep the lowest numbers
    @Order(Ordered.HIGHEST_PRECEDENCE)
    @EventListener(ApplicationReadyEvent.class)
    public void assignMissingEmployeeIds() {
        List<User> users = mongoTemplate.find(
                Query.query(Criteria.where("employeeId").is(null))
                        .with(Sort.by(Sort.Direction.ASC, "createdAt", "_id")),
                User.class);
        for (User user : users) {
            // Conditional, so a user given an id meanwhile is never renumbered
            mongoTemplate.updateFirst(
                    Query.query(Criteria.where("id").is(user.getId()).and("employeeId").is(null)),
                    Update.update("employeeId", employeeIdService.nextEmployeeId()),
                    User.class);
        }
        if (!users.isEmpty()) {
            log.info("Assigned employee ids to {} existing user(s)", users.size());
        }
    }
}
