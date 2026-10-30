package com.trackit.dto;

import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record CreateTaskRequest(

        @NotBlank(message = "Project is required")
        String projectId,

        @NotBlank(message = "Employee is required")
        String assigneeId,

        @NotBlank(message = "Title is required")
        @Size(min = 3, max = 120, message = "Title must be between 3 and 120 characters")
        String title,

        @Size(max = 2000, message = "Description must be at most 2000 characters")
        String description,

        @FutureOrPresent(message = "Due date cannot be in the past")
        LocalDate dueDate
) {
}
