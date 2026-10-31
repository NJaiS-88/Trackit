package com.trackit.service;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.trackit.config.AiServiceProperties;
import com.trackit.exception.AiServiceUnavailableException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import java.net.http.HttpClient;
import java.util.List;
import java.util.Map;

/** HTTP client for the Trackit AI service. The Gemini key stays there; this side only sends the service token. */
@Slf4j
@Component
public class AiServiceClient {

    /** The AI service's answer as-is; values are checked against Trackit's enums by the caller. */
    public record IncidentDraft(
            String title,
            String description,
            String category,
            @JsonProperty("affected_service") String affectedService,
            String impact,
            String urgency
    ) {
    }

    /** A department the routing model may choose; {@code description} says what it handles (may be null). */
    public record RoutingDepartment(String id, String name, String description) {
    }

    /** Matches the AI service's TicketRouteRequest (snake_case on the wire). */
    public record TicketRouteRequest(
            String title,
            String description,
            String category,
            @JsonProperty("affected_service") String affectedService,
            @JsonProperty("current_department_id") String currentDepartmentId,
            List<RoutingDepartment> departments
    ) {
    }

    /**
     * The model's recommendation; {@code departmentId} is always one of the departments sent.
     * {@code confidence} is HIGH, MEDIUM or LOW; {@code stay} means it recommends the current department.
     * {@code handoffNote} is a draft note for the receiving Lead, empty when staying.
     */
    public record TicketRoute(
            @JsonProperty("department_id") String departmentId,
            @JsonProperty("department_name") String departmentName,
            String confidence,
            String reason,
            boolean stay,
            String model,
            @JsonProperty("handoff_note") String handoffNote
    ) {
    }

    static final String ROUTING_UNAVAILABLE =
            "The AI routing assistant is unavailable right now. You can still pass the ticket yourself.";

    private final RestClient restClient;

    public AiServiceClient(AiServiceProperties properties, RestClient.Builder builder) {
        HttpClient httpClient = HttpClient.newBuilder().connectTimeout(properties.connectTimeout()).build();
        JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(httpClient);
        requestFactory.setReadTimeout(properties.timeout());

        builder.baseUrl(properties.baseUrl()).requestFactory(requestFactory);
        if (StringUtils.hasText(properties.serviceToken())) {
            builder.defaultHeader("X-Service-Token", properties.serviceToken());
        }
        this.restClient = builder.build();
    }

    /**
     * Asks the model to fill the New Incident fields from the employee's own words.
     *
     * @throws AiServiceUnavailableException if the service is unreachable, slow, rejects the token or the model fails
     */
    public IncidentDraft draftIncident(String description) {
        try {
            IncidentDraft draft = restClient.post()
                    .uri("/api/incident-draft")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("description", description))
                    .retrieve()
                    .body(IncidentDraft.class);
            if (draft == null) {
                throw new AiServiceUnavailableException();
            }
            return draft;
        } catch (RestClientResponseException e) {
            log.warn("AI service answered {} to an incident draft: {}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new AiServiceUnavailableException();
        } catch (RestClientException e) {
            // Connection refused, timeout or unreadable body
            log.warn("AI service unreachable for an incident draft: {}", e.getMessage());
            throw new AiServiceUnavailableException();
        }
    }

    /**
     * Asks the routing model which department should handle a ticket. Only a recommendation: a Lead decides.
     *
     * @throws AiServiceUnavailableException if the service is unreachable, slow, rejects the token or the model fails
     */
    public TicketRoute routeTicket(TicketRouteRequest request) {
        try {
            TicketRoute route = restClient.post()
                    .uri("/api/tickets/route")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(request)
                    .retrieve()
                    .body(TicketRoute.class);
            if (route == null || !StringUtils.hasText(route.departmentId())) {
                throw new AiServiceUnavailableException(ROUTING_UNAVAILABLE);
            }
            return route;
        } catch (RestClientResponseException e) {
            log.warn("AI service answered {} to a ticket route: {}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new AiServiceUnavailableException(ROUTING_UNAVAILABLE);
        } catch (RestClientException e) {
            log.warn("AI service unreachable for a ticket route: {}", e.getMessage());
            throw new AiServiceUnavailableException(ROUTING_UNAVAILABLE);
        }
    }
}
