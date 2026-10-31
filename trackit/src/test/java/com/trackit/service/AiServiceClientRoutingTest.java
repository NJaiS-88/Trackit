package com.trackit.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import com.trackit.config.AiServiceProperties;
import com.trackit.exception.AiServiceUnavailableException;
import com.trackit.service.AiServiceClient.RoutingDepartment;
import com.trackit.service.AiServiceClient.TicketRoute;
import com.trackit.service.AiServiceClient.TicketRouteRequest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Calls a tiny local HTTP server standing in for the AI service; no Spring context, no real model. */
class AiServiceClientRoutingTest {

    private static final TicketRouteRequest REQUEST = new TicketRouteRequest(
            "Payroll report is wrong",
            "The payroll report shows last month's salaries.",
            "SOFTWARE",
            "Finance portal",
            "dep-it",
            List.of(new RoutingDepartment("dep-it", "IT Support", "Laptops and VPN"),
                    new RoutingDepartment("dep-fin", "Finance", null)));

    private final ObjectMapper objectMapper = new ObjectMapper();
    private HttpServer server;

    @AfterEach
    void stopServer() {
        if (server != null) {
            server.stop(0);
        }
    }

    /** Starts a server on a free port answering /api/tickets/route; returns the request it received. */
    private AtomicReference<String[]> serve(int status, String body) throws IOException {
        AtomicReference<String[]> received = new AtomicReference<>();
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/api/tickets/route", exchange -> {
            String requestBody = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
            received.set(new String[]{exchange.getRequestHeaders().getFirst("X-Service-Token"), requestBody});
            byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(status, bytes.length);
            exchange.getResponseBody().write(bytes);
            exchange.close();
        });
        server.start();
        return received;
    }

    private AiServiceClient client(String baseUrl) {
        AiServiceProperties properties =
                new AiServiceProperties(baseUrl, "test-token", Duration.ofSeconds(2), Duration.ofSeconds(2));
        return new AiServiceClient(properties, RestClient.builder());
    }

    private String baseUrl() {
        return "http://127.0.0.1:" + server.getAddress().getPort();
    }

    @Test
    void sendsTicketInSnakeCaseWithTokenAndReadsRecommendation() throws IOException {
        AtomicReference<String[]> received = serve(200, """
                {"department_id": "dep-fin", "department_name": "Finance", "confidence": "HIGH",
                 "reason": "Payroll report in the finance portal.", "stay": false, "model": "typesafe/jev-router",
                 "handoff_note": "Payroll report shows last month's salaries."}
                """);

        TicketRoute route = client(baseUrl()).routeTicket(REQUEST);

        assertThat(route.departmentId()).isEqualTo("dep-fin");
        assertThat(route.departmentName()).isEqualTo("Finance");
        assertThat(route.confidence()).isEqualTo("HIGH");
        assertThat(route.stay()).isFalse();
        assertThat(route.model()).isEqualTo("typesafe/jev-router");
        assertThat(route.handoffNote()).isEqualTo("Payroll report shows last month's salaries.");

        assertThat(received.get()[0]).isEqualTo("test-token");
        JsonNode sent = objectMapper.readTree(received.get()[1]);
        assertThat(sent.get("affected_service").asText()).isEqualTo("Finance portal");
        assertThat(sent.get("current_department_id").asText()).isEqualTo("dep-it");
        assertThat(sent.get("departments")).hasSize(2);
        assertThat(sent.get("departments").get(0).get("name").asText()).isEqualTo("IT Support");
    }

    @Test
    void modelOrServiceErrorBecomesUnavailable() throws IOException {
        serve(502, "{\"detail\": \"The AI model could not recommend a department right now.\"}");

        assertThatThrownBy(() -> client(baseUrl()).routeTicket(REQUEST))
                .isInstanceOf(AiServiceUnavailableException.class)
                .hasMessage(AiServiceClient.ROUTING_UNAVAILABLE);
    }

    @Test
    void unreachableServiceBecomesUnavailable() throws IOException {
        serve(200, "{}");
        String closedUrl = baseUrl();
        server.stop(0);
        server = null;

        assertThatThrownBy(() -> client(closedUrl).routeTicket(REQUEST))
                .isInstanceOf(AiServiceUnavailableException.class);
    }

    @Test
    void answerWithoutDepartmentIsRejected() throws IOException {
        serve(200, "{\"confidence\": \"LOW\", \"reason\": \"?\"}");

        assertThatThrownBy(() -> client(baseUrl()).routeTicket(REQUEST))
                .isInstanceOf(AiServiceUnavailableException.class);
    }
}
