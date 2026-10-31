package com.trackit.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** A Lead passes a ticket to another department. */
public record TransferTicketRequest(

        @NotBlank(message = "Choose a department")
        String toDepartmentId,

        // Shown to the receiving Lead, e.g. "Payroll report, not an IT issue"
        @Size(max = 500, message = "Note must be at most 500 characters")
        String note
) {
}
