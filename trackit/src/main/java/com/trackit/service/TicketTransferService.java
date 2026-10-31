package com.trackit.service;

import com.trackit.dto.DepartmentOptionResponse;
import com.trackit.dto.TicketTransferResponse;
import com.trackit.dto.TransferTicketRequest;
import com.trackit.exception.ResourceNotFoundException;
import com.trackit.exception.UnauthorizedException;
import com.trackit.exception.WorkflowViolationException;
import com.trackit.model.Department;
import com.trackit.model.Incident;
import com.trackit.model.Role;
import com.trackit.model.RoutingRecommendation;
import com.trackit.model.TicketTransfer;
import com.trackit.model.User;
import com.trackit.model.enums.IncidentStatus;
import com.trackit.model.enums.WorkItemStatus;
import com.trackit.repository.DepartmentRepository;
import com.trackit.repository.IncidentRepository;
import com.trackit.repository.TicketTransferRepository;
import com.trackit.repository.UserRepository;
import com.trackit.repository.WorkItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/** A Lead passes a ticket their department handles to another department, whose Lead then handles it. */
@Service
@RequiredArgsConstructor
public class TicketTransferService {

    private static final Set<IncidentStatus> FINISHED = Set.of(IncidentStatus.RESOLVED, IncidentStatus.CLOSED);

    private final IncidentRepository incidentRepository;
    private final DepartmentRepository departmentRepository;
    private final UserRepository userRepository;
    private final WorkItemRepository workItemRepository;
    private final TicketTransferRepository ticketTransferRepository;
    private final TicketDepartments ticketDepartments;
    private final TicketRoutingService ticketRoutingService;

    /** Every time the ticket was passed between departments, oldest first. */
    public List<TicketTransferResponse> history(String incidentId) {
        return toResponses(ticketTransferRepository.findByIncidentIdOrderByCreatedAtAsc(incidentId));
    }

    /** Each ticket's most recent pass, keyed by ticket id; tickets never passed are absent. */
    public Map<String, TicketTransferResponse> latestByTicket(Collection<String> incidentIds) {
        if (incidentIds.isEmpty()) {
            return Map.of();
        }
        Map<String, TicketTransfer> latest = new LinkedHashMap<>();
        // Newest first, so the first one seen per ticket is its latest pass
        ticketTransferRepository.findByIncidentIdInOrderByCreatedAtDesc(incidentIds)
                .forEach(t -> latest.putIfAbsent(t.getIncidentId(), t));
        List<TicketTransferResponse> responses = toResponses(List.copyOf(latest.values()));
        Map<String, TicketTransferResponse> byTicket = new LinkedHashMap<>();
        int index = 0;
        for (String incidentId : latest.keySet()) {
            byTicket.put(incidentId, responses.get(index++));
        }
        return byTicket;
    }

    /** Resolves department and Lead names with one query each. */
    private List<TicketTransferResponse> toResponses(List<TicketTransfer> transfers) {
        if (transfers.isEmpty()) {
            return List.of();
        }
        Set<String> departmentIds = transfers.stream()
                .flatMap(t -> Stream.of(t.getFromDepartmentId(), t.getToDepartmentId()))
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<String, String> departmentNames = departmentRepository.findAllById(departmentIds).stream()
                .collect(Collectors.toMap(Department::getId, Department::getName));
        Set<String> leadIds = transfers.stream()
                .map(TicketTransfer::getPassedBy)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<String, String> leadNames = userRepository.findAllById(leadIds).stream()
                .collect(Collectors.toMap(User::getId, User::getName));
        return transfers.stream()
                .map(t -> new TicketTransferResponse(
                        t.getId(),
                        t.getFromDepartmentId(),
                        t.getFromDepartmentId() == null ? null : departmentNames.get(t.getFromDepartmentId()),
                        t.getToDepartmentId(),
                        departmentNames.get(t.getToDepartmentId()),
                        leadNames.get(t.getPassedBy()),
                        t.getNote(),
                        t.isFollowedRecommendation(),
                        t.getCreatedAt()))
                .toList();
    }

    /** Every department, A to Z, with its Leads, so a Lead can see who would receive a ticket. */
    public List<DepartmentOptionResponse> departmentOptions(String leadId) {
        String ownDepartmentId = userRepository.findById(leadId).map(User::getDepartmentId).orElse(null);
        List<Department> departments = departmentRepository.findAll(Sort.by("name"));
        Map<String, List<String>> leadsByDepartment = userRepository
                .findByDepartmentIdInAndRoleAndActiveTrueOrderByNameAsc(
                        departments.stream().map(Department::getId).toList(), Role.ENGINEER)
                .stream()
                .collect(Collectors.groupingBy(User::getDepartmentId,
                        Collectors.mapping(User::getName, Collectors.toList())));
        return departments.stream()
                .map(d -> new DepartmentOptionResponse(
                        d.getId(),
                        d.getName(),
                        d.getDescription(),
                        leadsByDepartment.getOrDefault(d.getId(), List.of()),
                        d.getId().equals(ownDepartmentId)))
                .toList();
    }

    public TicketTransferResponse transfer(String leadId, String incidentId, TransferTicketRequest request) {
        User lead = userRepository.findById(leadId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", leadId));
        if (lead.getDepartmentId() == null) {
            throw new WorkflowViolationException("You have not been assigned to a department yet");
        }
        Incident incident = incidentRepository.findById(incidentId)
                .filter(Incident::isActive)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket", "id", incidentId));
        String fromDepartmentId = ticketDepartments.handlingDepartmentId(incident);
        if (!lead.getDepartmentId().equals(fromDepartmentId)) {
            throw new UnauthorizedException("This ticket is not handled by your department");
        }
        if (FINISHED.contains(incident.getStatus())) {
            throw new WorkflowViolationException(
                    "This ticket is already " + incident.getStatus().name().toLowerCase(Locale.ROOT));
        }
        Department to = departmentRepository.findById(request.toDepartmentId())
                .orElseThrow(() -> new ResourceNotFoundException("Department", "id", request.toDepartmentId()));
        if (to.getId().equals(fromDepartmentId)) {
            throw new WorkflowViolationException("This ticket is already handled by " + to.getName());
        }
        boolean hasOpenWork = workItemRepository.findByIncidentIdOrderByCreatedAtAsc(incidentId).stream()
                .anyMatch(w -> WorkItemStatus.OPEN.contains(w.getStatus()));
        if (hasOpenWork) {
            throw new WorkflowViolationException(
                    "Employees are still assigned to this ticket. Finish or reassign their work before passing it.");
        }

        RoutingRecommendation recommendation = incident.getRoutingRecommendation();
        boolean followedRecommendation = recommendation != null && to.getId().equals(recommendation.getDepartmentId());
        Instant now = Instant.now();

        incident.setHandlingDepartmentId(to.getId());
        // The receiving Lead owns it from here, and the old recommendation was made for the previous department
        incident.setAssignedTo(null);
        if (incident.getStatus() == IncidentStatus.ASSIGNED) {
            incident.setStatus(IncidentStatus.OPEN);
        }
        incident.setRoutingRecommendation(null);
        incident.setUpdatedAt(now);
        incidentRepository.save(incident);

        TicketTransfer transfer = ticketTransferRepository.save(TicketTransfer.builder()
                .incidentId(incidentId)
                .fromDepartmentId(fromDepartmentId)
                .toDepartmentId(to.getId())
                .passedBy(leadId)
                .note(StringUtils.hasText(request.note()) ? request.note().trim() : null)
                .followedRecommendation(followedRecommendation)
                .createdAt(now)
                .build());

        // Gives the receiving Lead the AI's view from their department's side
        ticketRoutingService.recommendInBackground(incidentId);

        String fromName = fromDepartmentId == null
                ? null
                : departmentRepository.findById(fromDepartmentId).map(Department::getName).orElse(null);
        return new TicketTransferResponse(
                transfer.getId(),
                fromDepartmentId,
                fromName,
                to.getId(),
                to.getName(),
                lead.getName(),
                transfer.getNote(),
                followedRecommendation,
                transfer.getCreatedAt());
    }
}
