package com.trackit.dto;

import com.trackit.model.enums.ProjectStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateProjectStatusRequest(
        @NotNull(message = "Status is required")
        ProjectStatus status
) {
}
