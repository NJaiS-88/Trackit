package com.trackit.service;

import com.trackit.dto.IncidentDraftResponse;
import com.trackit.model.enums.Category;
import com.trackit.model.enums.Impact;
import com.trackit.model.enums.Urgency;
import com.trackit.service.AiServiceClient.IncidentDraft;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.Locale;

/**
 * Fills the New Incident form from an employee's description using the AI service. Every value is checked against
 * Trackit's own enums and the form's length limits, so a surprising model answer can never break the form.
 */
@Service
@RequiredArgsConstructor
public class IncidentDraftService {

    // Same limits as CreateIncidentRequest
    private static final int TITLE_MAX = 120;
    private static final int DESCRIPTION_MAX = 3000;
    private static final int AFFECTED_SERVICE_MAX = 120;

    private final AiServiceClient aiServiceClient;

    public IncidentDraftResponse draft(String description) {
        String original = description.trim();
        IncidentDraft draft = aiServiceClient.draftIncident(original);
        return new IncidentDraftResponse(
                capOrDefault(draft.title(), TITLE_MAX, ""),
                // Never lose what the employee wrote, even if the model returned nothing useful
                capOrDefault(draft.description(), DESCRIPTION_MAX, original),
                toEnum(Category.class, draft.category(), Category.OTHER),
                capOrDefault(draft.affectedService(), AFFECTED_SERVICE_MAX, null),
                // Same defaults the prompt asks for when the employee doesn't say
                toEnum(Impact.class, draft.impact(), Impact.LOW),
                toEnum(Urgency.class, draft.urgency(), Urgency.MEDIUM));
    }

    private static String capOrDefault(String value, int max, String fallback) {
        if (!StringUtils.hasText(value)) {
            return fallback;
        }
        String trimmed = value.trim();
        return trimmed.length() > max ? trimmed.substring(0, max) : trimmed;
    }

    private static <E extends Enum<E>> E toEnum(Class<E> type, String value, E fallback) {
        if (!StringUtils.hasText(value)) {
            return fallback;
        }
        try {
            return Enum.valueOf(type, value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            return fallback;
        }
    }
}
