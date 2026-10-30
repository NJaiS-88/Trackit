package com.trackit.dto;

import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.List;

/** Assigns a ticket to one or more employees; each gets their own work item. */
public record AssignTicketRequest(

        @NotEmpty(message = "Choose at least one employee")
        @Size(max = 50, message = "At most 50 employees can be assigned at once")
        List<@NotBlank(message = "Employee is required") String> assigneeIds,

        @FutureOrPresent(message = "Due date cannot be in the past")
        LocalDate dueDate
) {
}
