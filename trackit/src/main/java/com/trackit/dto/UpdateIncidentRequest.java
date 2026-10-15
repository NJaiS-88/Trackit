package com.trackit.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Partial update: null fields are left unchanged. */
public record UpdateIncidentRequest(

        @Size(max = 120, message = "Title must be at most 120 characters")
        @Pattern(regexp = "(?s).*\\S.*", message = "Title must not be blank")
        String title,

        @Size(max = 3000, message = "Description must be at most 3000 characters")
        @Pattern(regexp = "(?s).*\\S.*", message = "Description must not be blank")
        String description,

        @Size(max = 120, message = "Affected service must be at most 120 characters")
        String affectedService
) {
}
