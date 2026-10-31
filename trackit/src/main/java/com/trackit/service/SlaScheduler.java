package com.trackit.service;

import com.trackit.model.Incident;
import com.trackit.model.enums.SlaStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.List;

/**
 * Keeps the stored SLA status current as time passes, for dashboard counts and filters. API responses work the
 * status out live, so they are right even between runs (or while the host is asleep).
 * Only SLA fields are written, with targeted updates, so user edits to the rest of an incident are never lost.
 */
@Slf4j
@Component
@EnableScheduling
@RequiredArgsConstructor
public class SlaScheduler {

    private final MongoTemplate mongoTemplate;
    private final SlaService slaService;

    /** Gives incidents created before SLA tracking existed a deadline. */
    @EventListener(ApplicationReadyEvent.class)
    public void backfillDeadlines() {
        Instant now = Instant.now();
        List<Incident> untracked = mongoTemplate.find(
                Query.query(Criteria.where("active").is(true).and("dueAt").is(null)), Incident.class);
        for (Incident incident : untracked) {
            slaService.initialize(incident, now);
            mongoTemplate.updateFirst(
                    Query.query(Criteria.where("id").is(incident.getId()).and("dueAt").is(null)),
                    new Update()
                            .set("dueAt", incident.getDueAt())
                            .set("slaWarningAt", incident.getSlaWarningAt())
                            .set("slaPausedAt", incident.getSlaPausedAt())
                            .set("slaPausedMillis", incident.getSlaPausedMillis())
                            .set("resolvedAt", incident.getResolvedAt())
                            .set("slaStatus", incident.getSlaStatus()),
                    Incident.class);
        }
        if (!untracked.isEmpty()) {
            log.info("SLA: set deadlines on {} existing incident(s)", untracked.size());
        }
    }

    /** Running incidents past their warning time become DUE_SOON; past their deadline, BREACHED. */
    @Scheduled(fixedDelayString = "PT1M", initialDelayString = "PT30S")
    public void refreshStatuses() {
        Instant now = Instant.now();
        List<String> running = SlaService.CLOCK_RUNNING.stream().map(Enum::name).toList();

        long breached = mongoTemplate.updateMulti(
                Query.query(Criteria.where("active").is(true)
                        .and("status").in(running)
                        .and("slaStatus").in(SlaStatus.NORMAL, SlaStatus.DUE_SOON)
                        .and("dueAt").lte(now)),
                Update.update("slaStatus", SlaStatus.BREACHED),
                Incident.class).getModifiedCount();

        long dueSoon = mongoTemplate.updateMulti(
                Query.query(Criteria.where("active").is(true)
                        .and("status").in(running)
                        .and("slaStatus").is(SlaStatus.NORMAL)
                        .and("slaWarningAt").lte(now)),
                Update.update("slaStatus", SlaStatus.DUE_SOON),
                Incident.class).getModifiedCount();

        if (breached + dueSoon > 0) {
            log.info("SLA: {} incident(s) now breached, {} due soon", breached, dueSoon);
        }
    }
}
