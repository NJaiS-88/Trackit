package com.trackit.service;

import com.trackit.config.AsyncConfig;
import com.trackit.exception.AiServiceUnavailableException;
import com.trackit.exception.ResourceNotFoundException;
import com.trackit.exception.UnauthorizedException;
import com.trackit.exception.WorkflowViolationException;
import com.trackit.model.Department;
import com.trackit.model.Incident;
import com.trackit.model.RoutingRecommendation;
import com.trackit.model.User;
import com.trackit.repository.DepartmentRepository;
import com.trackit.repository.IncidentRepository;
import com.trackit.repository.UserRepository;
import com.trackit.service.AiServiceClient.RoutingDepartment;
import com.trackit.service.AiServiceClient.TicketRoute;
import com.trackit.service.AiServiceClient.TicketRouteRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

/**
 * Asks the AI which department should handle a ticket and stores the answer on it.
 * The recommendation is advice for the Lead; this service never moves a ticket.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TicketRoutingService {

    /** The AI service accepts at most this many departments per request. */
    static final int MAX_DEPARTMENTS = 50;

    private final IncidentRepository incidentRepository;
    private final DepartmentRepository departmentRepository;
    private final UserRepository userRepository;
    private final AiServiceClient aiServiceClient;
    private final MongoTemplate mongoTemplate;

    /**
     * Generates and saves a fresh recommendation for the ticket.
     *
     * @throws com.trackit.exception.AiServiceUnavailableException if the AI service or its model can't answer
     */
    public RoutingRecommendation recommend(String incidentId) {
        Incident incident = incidentRepository.findById(incidentId)
                .filter(Incident::isActive)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket", "id", incidentId));
        List<Department> departments = departmentRepository.findAll(Sort.by("name")).stream()
                .limit(MAX_DEPARTMENTS)
                .toList();
        if (departments.isEmpty()) {
            throw new WorkflowViolationException("There are no departments to route tickets to yet");
        }

        String currentDepartmentId = currentDepartmentId(incident);
        TicketRoute route = aiServiceClient.routeTicket(new TicketRouteRequest(
                incident.getTitle(),
                incident.getDescription(),
                incident.getCategory(),
                incident.getAffectedService(),
                currentDepartmentId,
                departments.stream()
                        .map(d -> new RoutingDepartment(d.getId(), d.getName(), d.getDescription()))
                        .toList()));

        RoutingRecommendation recommendation = RoutingRecommendation.builder()
                .departmentId(route.departmentId())
                .departmentName(route.departmentName())
                .confidence(route.confidence())
                .reason(route.reason())
                .stay(route.stay())
                .forDepartmentId(currentDepartmentId)
                .model(route.model())
                .generatedAt(Instant.now())
                .build();

        // Only this field is written, so a recommendation arriving later can't overwrite other edits to the ticket
        mongoTemplate.updateFirst(
                Query.query(Criteria.where("_id").is(incident.getId())),
                new Update().set("routingRecommendation", recommendation),
                Incident.class);
        return recommendation;
    }

    /**
     * A Lead re-runs the recommendation, e.g. after the AI was unavailable. Only for tickets their department
     * handles.
     */
    public RoutingRecommendation recommendForLead(String leadId, String incidentId) {
        String leadDepartmentId = userRepository.findById(leadId).map(User::getDepartmentId).orElse(null);
        if (leadDepartmentId == null) {
            throw new WorkflowViolationException("You have not been assigned to a department yet");
        }
        Incident incident = incidentRepository.findById(incidentId)
                .filter(Incident::isActive)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket", "id", incidentId));
        if (!leadDepartmentId.equals(currentDepartmentId(incident))) {
            throw new UnauthorizedException("This ticket is not handled by your department");
        }
        return recommend(incidentId);
    }

    /**
     * {@link #recommend} on a background thread, for a newly raised ticket. Failures are only logged: the ticket
     * simply has no recommendation yet, and a Lead can still pass it or re-run the recommendation.
     */
    @Async(AsyncConfig.ROUTING_EXECUTOR)
    public void recommendInBackground(String incidentId) {
        try {
            recommend(incidentId);
        } catch (AiServiceUnavailableException | WorkflowViolationException e) {
            log.info("No routing recommendation for ticket {}: {}", incidentId, e.getMessage());
        } catch (RuntimeException e) {
            log.warn("Routing recommendation failed for ticket {}", incidentId, e);
        }
    }

    /** The department handling the ticket now: the reporter's department. */
    private String currentDepartmentId(Incident incident) {
        return userRepository.findById(incident.getCreatedBy()).map(User::getDepartmentId).orElse(null);
    }
}
