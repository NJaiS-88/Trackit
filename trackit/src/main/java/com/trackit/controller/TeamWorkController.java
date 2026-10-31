package com.trackit.controller;

import com.trackit.dto.AssignTicketRequest;
import com.trackit.dto.AssignWorkRequest;
import com.trackit.dto.CreateTaskRequest;
import com.trackit.dto.RoutingRecommendationResponse;
import com.trackit.dto.TeamTicketResponse;
import com.trackit.dto.TicketTransferResponse;
import com.trackit.dto.TransferTicketRequest;
import com.trackit.dto.WorkItemResponse;
import com.trackit.security.CurrentUser;
import com.trackit.service.TicketRoutingService;
import com.trackit.service.TicketTransferService;
import com.trackit.service.WorkItemService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/team")
@RequiredArgsConstructor
@Tag(name = "Team work", description = "A Lead assigns project tasks and department tickets to employees")
public class TeamWorkController {

    private final WorkItemService workItemService;
    private final TicketRoutingService ticketRoutingService;
    private final TicketTransferService ticketTransferService;

    @GetMapping("/work")
    @PreAuthorize("hasRole('ENGINEER')")
    @Operation(summary = "All work assigned in the Lead's department, newest first")
    public List<WorkItemResponse> getTeamWork() {
        return workItemService.getTeamWork(CurrentUser.get().id());
    }

    @GetMapping("/tickets")
    @PreAuthorize("hasRole('ENGINEER')")
    @Operation(summary = "Unresolved tickets raised in the Lead's department")
    public List<TeamTicketResponse> getTeamTickets() {
        return workItemService.getTeamTickets(CurrentUser.get().id());
    }

    @PostMapping("/work/tasks")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ENGINEER')")
    @Operation(summary = "Assign a project task to one or more employees on that project")
    public List<WorkItemResponse> createTask(@Valid @RequestBody CreateTaskRequest request) {
        return workItemService.createTask(CurrentUser.get().id(), request);
    }

    @PostMapping("/tickets/{incidentId}/recommendation")
    @PreAuthorize("hasRole('ENGINEER')")
    @Operation(summary = "Re-run the AI recommendation of which department should handle a ticket")
    public RoutingRecommendationResponse recommendDepartment(@PathVariable String incidentId) {
        return RoutingRecommendationResponse.from(
                ticketRoutingService.recommendForLead(CurrentUser.get().id(), incidentId));
    }

    @PostMapping("/tickets/{incidentId}/transfer")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ENGINEER')")
    @Operation(summary = "Pass a ticket your department handles to another department's Lead")
    public TicketTransferResponse transferTicket(@PathVariable String incidentId,
                                                 @Valid @RequestBody TransferTicketRequest request) {
        return ticketTransferService.transfer(CurrentUser.get().id(), incidentId, request);
    }

    @PostMapping("/tickets/{incidentId}/assign")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ENGINEER')")
    @Operation(summary = "Assign a department ticket to one or more employees")
    public List<WorkItemResponse> assignTicket(@PathVariable String incidentId,
                                               @Valid @RequestBody AssignTicketRequest request) {
        return workItemService.assignTicket(CurrentUser.get().id(), incidentId, request);
    }

    @PatchMapping("/work/{id}/assignee")
    @PreAuthorize("hasRole('ENGINEER')")
    @Operation(summary = "Reassign open work, e.g. after an employee declined it")
    public WorkItemResponse reassign(@PathVariable String id, @Valid @RequestBody AssignWorkRequest request) {
        return workItemService.reassign(CurrentUser.get().id(), id, request);
    }
}
