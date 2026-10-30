package com.trackit.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

/** Creates the same task for each chosen employee; each gets their own work item. */
public record CreateTaskRequest(

        @NotBlank(message = "Project is required")
        String projectId,

        @NotEmpty(message = "Choose at least one employee")
        @Size(max = 50, message = "At most 50 employees can be assigned at once")
        List<@NotBlank(message = "Employee is required") String> assigneeIds,

        @NotBlank(message = "Title is required")
        @Size(min = 3, max = 120, message = "Title must be between 3 and 120 characters")
        String title,

        @Size(max = 2000, message = "Description must be at most 2000 characters")
        String description,

        @FutureOrPresent(message = "Due date cannot be in the past")
        LocalDate dueDate,

        LocalTime dueTime
) {

    @JsonIgnore
    @AssertTrue(message = "Choose a due date to go with the time")
    public boolean isDueTimeWithDate() {
        return dueTime == null || dueDate != null;
    }
}
