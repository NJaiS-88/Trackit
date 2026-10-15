package com.trackit.dto;

import com.trackit.model.enums.Category;
import com.trackit.model.enums.IncidentStatus;
import com.trackit.model.enums.Priority;

/** Optional query-string filters for {@code GET /api/incidents}; null means "any". */
public record IncidentFilterRequest(
        IncidentStatus status,
        Priority priority,
        Category category,
        String assignedTo
) {
}
