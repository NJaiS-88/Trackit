package com.trackit.controller;

import com.trackit.dto.WorkItemResponse;
import com.trackit.service.WorkItemService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/work")
@RequiredArgsConstructor
@Tag(name = "Work overview", description = "Admin view of all assigned work")
public class AdminWorkController {

    private final WorkItemService workItemService;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Every work item across all departments, newest first")
    public List<WorkItemResponse> getAllWork() {
        return workItemService.getAllWork();
    }
}
