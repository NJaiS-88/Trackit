package com.trackit.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

public record RegisterRequest(

        @NotBlank(message = "Name is required")
        @Size(min = 2, max = 100, message = "Name must be between 2 and 100 characters")
        String name,

        @NotBlank(message = "Email is required")
        @Email(message = "Email must be a valid email address")
        @Size(max = 254, message = "Email must be at most 254 characters")
        String email,

        // BCrypt only uses the first 72 bytes of input
        @NotBlank(message = "Password is required")
        @Size(min = 8, max = 72, message = "Password must be between 8 and 72 characters")
        String password,

        /** Optional; only meaningful once the user is promoted to ENGINEER. */
        @Size(max = 20, message = "At most 20 expertise entries are allowed")
        List<@NotBlank(message = "Expertise entries must not be blank")
             @Size(max = 50, message = "Expertise entries must be at most 50 characters") String> expertise
) {
}
