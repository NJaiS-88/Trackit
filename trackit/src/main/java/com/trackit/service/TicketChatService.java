package com.trackit.service;

import com.trackit.dto.TicketChatResponse;
import com.trackit.dto.TicketMessageResponse;
import com.trackit.dto.TicketMessageResponse.AuthorRole;
import com.trackit.exception.ResourceNotFoundException;
import com.trackit.exception.UnauthorizedException;
import com.trackit.exception.WorkflowViolationException;
import com.trackit.model.Incident;
import com.trackit.model.Role;
import com.trackit.model.TicketMessage;
import com.trackit.model.User;
import com.trackit.model.enums.IncidentStatus;
import com.trackit.model.enums.WorkItemStatus;
import com.trackit.repository.IncidentRepository;
import com.trackit.repository.TicketMessageRepository;
import com.trackit.repository.UserRepository;
import com.trackit.repository.WorkItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Chat on a ticket between the employee who reported it and the employees currently assigned to it.
 * The department's Lead and admins can read the conversation but not send. The history belongs to the ticket,
 * so a newly assigned employee sees everything said before; employees who were reassigned or declined lose access.
 * Closed tickets are read-only.
 */
@Service
@RequiredArgsConstructor
public class TicketChatService {

    private static final String ACCESS_DENIED = "You don't have access to this ticket's messages";
    private static final String READ_ONLY = "Only the reporter and the assigned employees can send messages";
    private static final String CLOSED = "This ticket is closed, so its messages are read-only";

    private final IncidentRepository incidentRepository;
    private final WorkItemRepository workItemRepository;
    private final UserRepository userRepository;
    private final TicketMessageRepository messageRepository;

    public TicketChatResponse getChat(String incidentId, String userId, Role role) {
        Incident incident = findActiveIncident(incidentId);
        boolean participant = isParticipant(incident, userId, role);
        if (!participant && !canObserve(incident, userId, role)) {
            throw new UnauthorizedException(ACCESS_DENIED);
        }
        String disabledReason = !participant ? READ_ONLY : isClosed(incident) ? CLOSED : null;
        List<TicketMessage> messages = messageRepository.findByIncidentIdOrderByCreatedAtAsc(incident.getId());
        return new TicketChatResponse(disabledReason == null, disabledReason, toResponses(incident, messages));
    }

    public TicketMessageResponse send(String incidentId, String userId, Role role, String body) {
        Incident incident = findActiveIncident(incidentId);
        if (!isParticipant(incident, userId, role)) {
            throw new UnauthorizedException(canObserve(incident, userId, role) ? READ_ONLY : ACCESS_DENIED);
        }
        if (isClosed(incident)) {
            throw new WorkflowViolationException(CLOSED);
        }
        TicketMessage saved = messageRepository.save(TicketMessage.builder()
                .incidentId(incident.getId())
                .authorId(userId)
                .body(body.trim())
                .createdAt(Instant.now())
                .build());
        return toResponses(incident, List.of(saved)).getFirst();
    }

    /** The reporter, or an employee with work on the ticket that hasn't been declined. */
    private boolean isParticipant(Incident incident, String userId, Role role) {
        if (role != Role.EMPLOYEE) {
            return false;
        }
        if (userId.equals(incident.getCreatedBy())) {
            return true;
        }
        return workItemRepository.findByIncidentIdOrderByCreatedAtAsc(incident.getId()).stream()
                .anyMatch(w -> userId.equals(w.getAssignedTo()) && w.getStatus() != WorkItemStatus.DECLINED);
    }

    /** Admins, and Leads who can see the ticket (assigned to them or raised in their department). */
    private boolean canObserve(Incident incident, String userId, Role role) {
        return switch (role) {
            case ADMIN -> true;
            case ENGINEER -> userId.equals(incident.getAssignedTo()) || sameDepartment(userId, incident.getCreatedBy());
            case EMPLOYEE -> false;
        };
    }

    private boolean sameDepartment(String leadId, String reporterId) {
        if (reporterId == null) {
            return false;
        }
        Map<String, String> departments = userRepository.findAllById(List.of(leadId, reporterId)).stream()
                .filter(u -> u.getDepartmentId() != null)
                .collect(Collectors.toMap(User::getId, User::getDepartmentId));
        return departments.containsKey(leadId) && Objects.equals(departments.get(leadId), departments.get(reporterId));
    }

    private static boolean isClosed(Incident incident) {
        return incident.getStatus() == IncidentStatus.CLOSED;
    }

    private Incident findActiveIncident(String incidentId) {
        return incidentRepository.findById(incidentId)
                .filter(Incident::isActive)
                .orElseThrow(() -> new ResourceNotFoundException("Incident", "id", incidentId));
    }

    private List<TicketMessageResponse> toResponses(Incident incident, List<TicketMessage> messages) {
        Set<String> authorIds = messages.stream().map(TicketMessage::getAuthorId).collect(Collectors.toSet());
        Map<String, String> names = userRepository.findAllById(authorIds).stream()
                .collect(Collectors.toMap(User::getId, User::getName));
        return messages.stream()
                .map(m -> new TicketMessageResponse(
                        m.getId(),
                        m.getAuthorId(),
                        names.get(m.getAuthorId()),
                        m.getAuthorId().equals(incident.getCreatedBy()) ? AuthorRole.REPORTER : AuthorRole.ASSIGNEE,
                        m.getBody(),
                        m.getCreatedAt()))
                .toList();
    }
}
