package com.trackit.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** The employee's own description of the problem, which the AI turns into New Incident fields. */
public record IncidentDraftRequest(

        @NotBlank(message = "Describe your problem first")
        @Size(min = 10, max = 2000, message = "Description must be between 10 and 2000 characters")
        String description
) {
}
