package com.trackit.dto;

import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotBlank;

import java.time.LocalDate;

/** Assigns a ticket, or reassigns existing work, to an employee. {@code dueDate} is optional. */
public record AssignWorkRequest(

        @NotBlank(message = "Employee is required")
        String assigneeId,

        @FutureOrPresent(message = "Due date cannot be in the past")
        LocalDate dueDate
) {
}
