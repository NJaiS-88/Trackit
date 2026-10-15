package com.trackit.dto;

import com.trackit.model.enums.Category;
import com.trackit.model.enums.Impact;
import com.trackit.model.enums.Urgency;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateIncidentRequest(

        @NotBlank(message = "Title is required")
        @Size(max = 120, message = "Title must be at most 120 characters")
        String title,

        @NotBlank(message = "Description is required")
        @Size(max = 3000, message = "Description must be at most 3000 characters")
        String description,

        @NotNull(message = "Category is required")
        Category category,

        @Size(max = 120, message = "Affected service must be at most 120 characters")
        String affectedService,

        @NotNull(message = "Impact is required")
        Impact impact,

        @NotNull(message = "Urgency is required")
        Urgency urgency
) {
}
