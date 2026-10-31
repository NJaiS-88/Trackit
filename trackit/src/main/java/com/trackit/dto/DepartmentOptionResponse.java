package com.trackit.dto;

import java.util.List;

/**
 * A department a Lead can pass a ticket to. {@code leads} are its active Leads (who will receive the ticket);
 * {@code own} marks the requesting Lead's own department.
 */
public record DepartmentOptionResponse(
        String id,
        String name,
        String description,
        List<String> leads,
        boolean own
) {
}
