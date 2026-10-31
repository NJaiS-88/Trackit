package com.trackit.service;

import com.trackit.dto.TicketTransferResponse;
import com.trackit.dto.TransferTicketRequest;
import com.trackit.exception.ResourceNotFoundException;
import com.trackit.exception.UnauthorizedException;
import com.trackit.exception.WorkflowViolationException;
import com.trackit.model.Department;
import com.trackit.model.Incident;
import com.trackit.model.RoutingRecommendation;
import com.trackit.model.TicketTransfer;
import com.trackit.model.User;
import com.trackit.model.WorkItem;
import com.trackit.model.enums.IncidentStatus;
import com.trackit.model.enums.WorkItemStatus;
import com.trackit.repository.DepartmentRepository;
import com.trackit.repository.IncidentRepository;
import com.trackit.repository.TicketTransferRepository;
import com.trackit.repository.UserRepository;
import com.trackit.repository.WorkItemRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/** Repositories and the routing service are mocks; no database or AI service is needed. */
@ExtendWith(MockitoExtension.class)
class TicketTransferServiceTest {

    @Mock
    private IncidentRepository incidentRepository;
    @Mock
    private DepartmentRepository departmentRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private WorkItemRepository workItemRepository;
    @Mock
    private TicketTransferRepository ticketTransferRepository;
    @Mock
    private TicketDepartments ticketDepartments;
    @Mock
    private TicketRoutingService ticketRoutingService;

    private TicketTransferService service;
    private Incident ticket;

    private final Department it = Department.builder().id("dep-it").name("IT Support").build();
    private final Department finance = Department.builder().id("dep-fin").name("Finance").build();

    @BeforeEach
    void setUp() {
        service = new TicketTransferService(incidentRepository, departmentRepository, userRepository,
                workItemRepository, ticketTransferRepository, ticketDepartments, ticketRoutingService);
        ticket = Incident.builder()
                .id("inc-1")
                .status(IncidentStatus.ASSIGNED)
                .assignedTo("lead-it")
                .createdBy("emp-1")
                .active(true)
                .routingRecommendation(RoutingRecommendation.builder().departmentId("dep-fin").build())
                .build();
    }

    private void leadOf(String leadId, String departmentId) {
        when(userRepository.findById(leadId)).thenReturn(Optional.of(
                User.builder().id(leadId).name("Asha").departmentId(departmentId).build()));
    }

    private void ticketHandledBy(String departmentId) {
        when(incidentRepository.findById("inc-1")).thenReturn(Optional.of(ticket));
        when(ticketDepartments.handlingDepartmentId(ticket)).thenReturn(departmentId);
    }

    @Test
    void passesTheTicketToTheOtherDepartment() {
        leadOf("lead-it", "dep-it");
        ticketHandledBy("dep-it");
        when(departmentRepository.findById("dep-fin")).thenReturn(Optional.of(finance));
        when(departmentRepository.findById("dep-it")).thenReturn(Optional.of(it));
        when(workItemRepository.findByIncidentIdOrderByCreatedAtAsc("inc-1")).thenReturn(List.of());
        when(ticketTransferRepository.save(any())).thenAnswer(call -> call.getArgument(0));

        TicketTransferResponse response = service.transfer(
                "lead-it", "inc-1", new TransferTicketRequest("dep-fin", "  Payroll report, not IT  "));

        assertThat(ticket.getHandlingDepartmentId()).isEqualTo("dep-fin");
        assertThat(ticket.getAssignedTo()).isNull();
        assertThat(ticket.getStatus()).isEqualTo(IncidentStatus.OPEN);
        assertThat(ticket.getRoutingRecommendation()).isNull();
        verify(incidentRepository).save(ticket);

        ArgumentCaptor<TicketTransfer> saved = ArgumentCaptor.forClass(TicketTransfer.class);
        verify(ticketTransferRepository).save(saved.capture());
        assertThat(saved.getValue().getFromDepartmentId()).isEqualTo("dep-it");
        assertThat(saved.getValue().getToDepartmentId()).isEqualTo("dep-fin");
        assertThat(saved.getValue().getPassedBy()).isEqualTo("lead-it");
        assertThat(saved.getValue().getNote()).isEqualTo("Payroll report, not IT");
        assertThat(saved.getValue().isFollowedRecommendation()).isTrue();

        assertThat(response.fromDepartmentName()).isEqualTo("IT Support");
        assertThat(response.toDepartmentName()).isEqualTo("Finance");
        assertThat(response.passedByName()).isEqualTo("Asha");
        verify(ticketRoutingService).recommendInBackground("inc-1");
    }

    @Test
    void cannotPassAnotherDepartmentsTicket() {
        leadOf("lead-fin", "dep-fin");
        ticketHandledBy("dep-it");

        assertThatThrownBy(() -> service.transfer("lead-fin", "inc-1", new TransferTicketRequest("dep-it", null)))
                .isInstanceOf(UnauthorizedException.class);
        verify(incidentRepository, never()).save(any());
        verifyNoInteractions(ticketTransferRepository, ticketRoutingService);
    }

    @Test
    void cannotPassToTheSameDepartment() {
        leadOf("lead-it", "dep-it");
        ticketHandledBy("dep-it");
        when(departmentRepository.findById("dep-it")).thenReturn(Optional.of(it));

        assertThatThrownBy(() -> service.transfer("lead-it", "inc-1", new TransferTicketRequest("dep-it", null)))
                .isInstanceOf(WorkflowViolationException.class)
                .hasMessageContaining("already handled by IT Support");
    }

    @Test
    void cannotPassAResolvedTicket() {
        ticket.setStatus(IncidentStatus.RESOLVED);
        leadOf("lead-it", "dep-it");
        ticketHandledBy("dep-it");

        assertThatThrownBy(() -> service.transfer("lead-it", "inc-1", new TransferTicketRequest("dep-fin", null)))
                .isInstanceOf(WorkflowViolationException.class)
                .hasMessageContaining("resolved");
    }

    @Test
    void cannotPassWhileEmployeesAreStillAssigned() {
        leadOf("lead-it", "dep-it");
        ticketHandledBy("dep-it");
        when(departmentRepository.findById("dep-fin")).thenReturn(Optional.of(finance));
        when(workItemRepository.findByIncidentIdOrderByCreatedAtAsc("inc-1"))
                .thenReturn(List.of(WorkItem.builder().status(WorkItemStatus.IN_PROGRESS).build()));

        assertThatThrownBy(() -> service.transfer("lead-it", "inc-1", new TransferTicketRequest("dep-fin", null)))
                .isInstanceOf(WorkflowViolationException.class)
                .hasMessageContaining("still assigned");
        verify(incidentRepository, never()).save(any());
    }

    @Test
    void unknownDepartmentIsNotFound() {
        leadOf("lead-it", "dep-it");
        ticketHandledBy("dep-it");
        when(departmentRepository.findById("dep-x")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.transfer("lead-it", "inc-1", new TransferTicketRequest("dep-x", null)))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void notFollowingTheRecommendationIsRecorded() {
        ticket.setRoutingRecommendation(RoutingRecommendation.builder().departmentId("dep-hr").build());
        leadOf("lead-it", "dep-it");
        ticketHandledBy("dep-it");
        when(departmentRepository.findById("dep-fin")).thenReturn(Optional.of(finance));
        when(departmentRepository.findById("dep-it")).thenReturn(Optional.of(it));
        when(workItemRepository.findByIncidentIdOrderByCreatedAtAsc("inc-1")).thenReturn(List.of());
        when(ticketTransferRepository.save(any())).thenAnswer(call -> call.getArgument(0));

        assertThat(service.transfer("lead-it", "inc-1", new TransferTicketRequest("dep-fin", null))
                .followedRecommendation()).isFalse();
    }
}
