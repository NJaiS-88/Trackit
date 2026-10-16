package com.trackit.dto;

import com.trackit.model.enums.IncidentStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record StatusChangeRequest(

        @NotNull(message = "New status is required")
        IncidentStatus newStatus,

        @Size(max = 500, message = "Reason must be at most 500 characters")
        String reason
) {
}
