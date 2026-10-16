package com.trackit.service;

import com.trackit.model.enums.Impact;
import com.trackit.model.enums.Priority;
import com.trackit.model.enums.Urgency;
import org.springframework.stereotype.Service;

@Service
public class PriorityService {

    public Priority calculatePriority(Impact impact, Urgency urgency) {
        return switch (impact) {
            case HIGH -> urgency == Urgency.HIGH ? Priority.P1 : Priority.P2;
            case MEDIUM -> urgency == Urgency.HIGH ? Priority.P2 : Priority.P3;
            case LOW -> urgency == Urgency.HIGH ? Priority.P3 : Priority.P4;
        };
    }

    public String getPriorityLabel(Priority priority) {
        return switch (priority) {
            case P1 -> "Critical";
            case P2 -> "High";
            case P3 -> "Medium";
            case P4 -> "Low";
        };
    }
}
