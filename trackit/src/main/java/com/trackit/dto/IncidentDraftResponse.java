package com.trackit.dto;

import com.trackit.model.enums.Category;
import com.trackit.model.enums.Impact;
import com.trackit.model.enums.Urgency;

/**
 * Suggested New Incident fields, already valid for {@link CreateIncidentRequest}; the employee reviews and edits
 * them before submitting.
 */
public record IncidentDraftResponse(
        String title,
        String description,
        Category category,
        String affectedService,
        Impact impact,
        Urgency urgency
) {
}
