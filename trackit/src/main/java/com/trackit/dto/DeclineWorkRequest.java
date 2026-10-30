package com.trackit.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record DeclineWorkRequest(

        @NotBlank(message = "Please give a reason")
        @Size(min = 5, max = 500, message = "Reason must be between 5 and 500 characters")
        String reason
) {
}
