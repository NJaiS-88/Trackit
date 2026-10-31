package com.trackit.controller;

import com.trackit.dto.SendTicketMessageRequest;
import com.trackit.dto.TicketChatResponse;
import com.trackit.dto.TicketMessageResponse;
import com.trackit.security.AuthenticatedUser;
import com.trackit.security.CurrentUser;
import com.trackit.service.TicketChatService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Access rules (who may read or send) live in {@link TicketChatService}. */
@RestController
@RequestMapping("/api/incidents/{incidentId}/messages")
@RequiredArgsConstructor
@Tag(name = "Ticket chat", description = "Messages between a ticket's reporter and its assigned employees")
public class TicketChatController {

    private final TicketChatService ticketChatService;

    @GetMapping
    @Operation(summary = "The ticket's conversation, oldest first, and whether you may send")
    public TicketChatResponse getChat(@PathVariable String incidentId) {
        AuthenticatedUser user = CurrentUser.get();
        return ticketChatService.getChat(incidentId, user.id(), user.role());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Send a message (reporter and assigned employees only)")
    public TicketMessageResponse send(@PathVariable String incidentId,
                                      @Valid @RequestBody SendTicketMessageRequest request) {
        AuthenticatedUser user = CurrentUser.get();
        return ticketChatService.send(incidentId, user.id(), user.role(), request.body());
    }
}
