package com.trackit.controller;

import com.trackit.dto.AccountRequestResponse;
import com.trackit.exception.UnauthorizedException;
import com.trackit.model.enums.AccountRequestStatus;
import com.trackit.security.UserPrincipal;
import com.trackit.service.AccountRequestService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/account-requests")
@RequiredArgsConstructor
@Tag(name = "Account requests", description = "Admin review of sign-up requests")
@SecurityRequirement(name = "bearerAuth")
public class AccountRequestController {

    private final AccountRequestService accountRequestService;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "List account requests (paged); omit status for all")
    public Page<AccountRequestResponse> getRequests(
            @RequestParam(required = false) AccountRequestStatus status,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return accountRequestService.getRequests(status, pageable);
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Approve a pending request, creating an Employee account")
    public AccountRequestResponse approve(@PathVariable String id) {
        return accountRequestService.approve(id, getCurrentUserId());
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Reject a pending request")
    public AccountRequestResponse reject(@PathVariable String id) {
        return accountRequestService.reject(id, getCurrentUserId());
    }

    private String getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof UserPrincipal principal)) {
            throw new UnauthorizedException("Access denied");
        }
        return principal.getId();
    }
}
