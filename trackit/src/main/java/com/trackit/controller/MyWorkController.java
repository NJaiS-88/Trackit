package com.trackit.controller;

import com.trackit.dto.DeclineWorkRequest;
import com.trackit.dto.WorkItemResponse;
import com.trackit.security.CurrentUser;
import com.trackit.service.WorkItemService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/my-work")
@RequiredArgsConstructor
@Tag(name = "My work", description = "Work assigned to the signed-in employee")
public class MyWorkController {

    private final WorkItemService workItemService;

    @GetMapping
    @PreAuthorize("hasRole('EMPLOYEE')")
    @Operation(summary = "Work assigned to me, newest first")
    public List<WorkItemResponse> getMyWork() {
        return workItemService.getMyWork(CurrentUser.get().id());
    }

    @PostMapping("/{id}/start")
    @PreAuthorize("hasRole('EMPLOYEE')")
    @Operation(summary = "Start working on assigned work")
    public WorkItemResponse start(@PathVariable String id) {
        return workItemService.start(CurrentUser.get().id(), id);
    }

    @PostMapping("/{id}/complete")
    @PreAuthorize("hasRole('EMPLOYEE')")
    @Operation(summary = "Mark work as done; a ticket is resolved")
    public WorkItemResponse complete(@PathVariable String id) {
        return workItemService.complete(CurrentUser.get().id(), id);
    }

    @PostMapping("/{id}/decline")
    @PreAuthorize("hasRole('EMPLOYEE')")
    @Operation(summary = "Report that the work can't be done, with a reason; the Lead reassigns it")
    public WorkItemResponse decline(@PathVariable String id, @Valid @RequestBody DeclineWorkRequest request) {
        return workItemService.decline(CurrentUser.get().id(), id, request.reason());
    }
}
