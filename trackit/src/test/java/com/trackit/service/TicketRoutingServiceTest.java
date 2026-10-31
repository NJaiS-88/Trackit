package com.trackit.service;

import com.trackit.exception.AiServiceUnavailableException;
import com.trackit.exception.ResourceNotFoundException;
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
import org.bson.Document;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/** Repositories, MongoTemplate and the AI client are mocks; no database or AI service is needed. */
@ExtendWith(MockitoExtension.class)
class TicketRoutingServiceTest {

    @Mock
    private IncidentRepository incidentRepository;
    @Mock
    private DepartmentRepository departmentRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private AiServiceClient aiServiceClient;
    @Mock
    private MongoTemplate mongoTemplate;

    private TicketRoutingService service;

    private final Incident ticket = Incident.builder()
            .id("inc-1")
            .title("Payroll report is wrong")
            .description("The payroll report shows last month's salaries.")
            .category("SOFTWARE")
            .affectedService("Finance portal")
            .createdBy("emp-1")
            .active(true)
            .build();

    private final List<Department> departments = List.of(
            Department.builder().id("dep-fin").name("Finance").description("Payroll and invoices").build(),
            Department.builder().id("dep-it").name("IT Support").build());

    @BeforeEach
    void setUp() {
        service = new TicketRoutingService(
                incidentRepository, departmentRepository, userRepository, aiServiceClient, mongoTemplate);
    }

    private void reporterInDepartment(String departmentId) {
        when(userRepository.findById("emp-1"))
                .thenReturn(Optional.of(User.builder().id("emp-1").departmentId(departmentId).build()));
    }

    @Test
    void savesTheRecommendationOnTheTicket() {
        when(incidentRepository.findById("inc-1")).thenReturn(Optional.of(ticket));
        when(departmentRepository.findAll(any(Sort.class))).thenReturn(departments);
        reporterInDepartment("dep-it");
        when(aiServiceClient.routeTicket(any())).thenReturn(new TicketRoute(
                "dep-fin", "Finance", "HIGH", "Payroll report in the finance portal.", false, "typesafe/jev-router"));

        RoutingRecommendation recommendation = service.recommend("inc-1");

        assertThat(recommendation.getDepartmentId()).isEqualTo("dep-fin");
        assertThat(recommendation.getDepartmentName()).isEqualTo("Finance");
        assertThat(recommendation.getConfidence()).isEqualTo("HIGH");
        assertThat(recommendation.isStay()).isFalse();
        assertThat(recommendation.getForDepartmentId()).isEqualTo("dep-it");
        assertThat(recommendation.getModel()).isEqualTo("typesafe/jev-router");
        assertThat(recommendation.getGeneratedAt()).isNotNull();

        ArgumentCaptor<Update> update = ArgumentCaptor.forClass(Update.class);
        verify(mongoTemplate).updateFirst(any(Query.class), update.capture(), eq(Incident.class));
        assertThat(update.getValue().getUpdateObject().get("$set", Document.class))
                .containsOnlyKeys("routingRecommendation");
    }

    @Test
    void sendsTheTicketAndEveryDepartmentWithItsDescription() {
        when(incidentRepository.findById("inc-1")).thenReturn(Optional.of(ticket));
        when(departmentRepository.findAll(any(Sort.class))).thenReturn(departments);
        reporterInDepartment("dep-it");
        when(aiServiceClient.routeTicket(any()))
                .thenReturn(new TicketRoute("dep-it", "IT Support", "LOW", "Closest fit.", true, "m"));

        service.recommend("inc-1");

        ArgumentCaptor<TicketRouteRequest> sent = ArgumentCaptor.forClass(TicketRouteRequest.class);
        verify(aiServiceClient).routeTicket(sent.capture());
        assertThat(sent.getValue().title()).isEqualTo("Payroll report is wrong");
        assertThat(sent.getValue().category()).isEqualTo("SOFTWARE");
        assertThat(sent.getValue().affectedService()).isEqualTo("Finance portal");
        assertThat(sent.getValue().currentDepartmentId()).isEqualTo("dep-it");
        assertThat(sent.getValue().departments()).containsExactly(
                new RoutingDepartment("dep-fin", "Finance", "Payroll and invoices"),
                new RoutingDepartment("dep-it", "IT Support", null));
    }

    @Test
    void missingOrDeletedTicketIsNotFound() {
        when(incidentRepository.findById("gone")).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.recommend("gone")).isInstanceOf(ResourceNotFoundException.class);

        Incident deleted = Incident.builder().id("old").active(false).build();
        when(incidentRepository.findById("old")).thenReturn(Optional.of(deleted));
        assertThatThrownBy(() -> service.recommend("old")).isInstanceOf(ResourceNotFoundException.class);

        verifyNoInteractions(aiServiceClient, mongoTemplate);
    }

    @Test
    void noDepartmentsMeansNothingToRouteTo() {
        when(incidentRepository.findById("inc-1")).thenReturn(Optional.of(ticket));
        when(departmentRepository.findAll(any(Sort.class))).thenReturn(List.of());

        assertThatThrownBy(() -> service.recommend("inc-1"))
                .isInstanceOf(WorkflowViolationException.class)
                .hasMessageContaining("no departments");
        verifyNoInteractions(aiServiceClient, mongoTemplate);
    }

    @Test
    void aiFailureSavesNothing() {
        when(incidentRepository.findById("inc-1")).thenReturn(Optional.of(ticket));
        when(departmentRepository.findAll(any(Sort.class))).thenReturn(departments);
        reporterInDepartment("dep-it");
        when(aiServiceClient.routeTicket(any())).thenThrow(new AiServiceUnavailableException("unavailable"));

        assertThatThrownBy(() -> service.recommend("inc-1")).isInstanceOf(AiServiceUnavailableException.class);
        verify(mongoTemplate, never()).updateFirst(any(Query.class), any(Update.class), eq(Incident.class));
    }
}
