package com.trackit.controller;

import com.trackit.dto.CreateIncidentRequest;
import com.trackit.dto.IncidentFilterRequest;
import com.trackit.dto.IncidentResponse;
import com.trackit.dto.IncidentSummaryResponse;
import com.trackit.dto.PagedResponse;
import com.trackit.dto.UpdateIncidentRequest;
import com.trackit.exception.UnauthorizedException;
import com.trackit.security.AuthenticatedUser;
import com.trackit.security.UserPrincipal;
import com.trackit.service.IncidentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/incidents")
@RequiredArgsConstructor
@Tag(name = "Incidents", description = "Report, browse and manage incidents")
@SecurityRequirement(name = "bearerAuth")
public class IncidentController {

    private final IncidentService incidentService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('EMPLOYEE')")
    @Operation(summary = "Report a new incident")
    public IncidentResponse createIncident(@Valid @RequestBody CreateIncidentRequest request) {
        return incidentService.createIncident(request, getCurrentUser().id());
    }

    @GetMapping
    @Operation(summary = "List incidents visible to the caller (employees: own, engineers: assigned, admins: all)")
    public PagedResponse<IncidentSummaryResponse> getIncidents(
            @ModelAttribute IncidentFilterRequest filter,
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        AuthenticatedUser user = getCurrentUser();
        return incidentService.getIncidents(filter, pageable, user.id(), user.role());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get an incident by id")
    public IncidentResponse getIncident(@PathVariable String id) {
        AuthenticatedUser user = getCurrentUser();
        return incidentService.getIncidentById(id, user.id(), user.role());
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('EMPLOYEE')")
    @Operation(summary = "Edit an OPEN incident you reported")
    public IncidentResponse updateIncident(@PathVariable String id,
                                           @Valid @RequestBody UpdateIncidentRequest request) {
        AuthenticatedUser user = getCurrentUser();
        return incidentService.updateIncident(id, request, user.id(), user.role());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Soft-delete an incident")
    public void deleteIncident(@PathVariable String id) {
        incidentService.deleteIncident(id, getCurrentUser().role());
    }

    private AuthenticatedUser getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof UserPrincipal principal)) {
            throw new UnauthorizedException("Access denied");
        }
        return new AuthenticatedUser(principal.getId(), principal.getRole());
    }
}
