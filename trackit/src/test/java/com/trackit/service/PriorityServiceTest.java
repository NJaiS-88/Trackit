package com.trackit.service;

import com.trackit.model.enums.Impact;
import com.trackit.model.enums.Priority;
import com.trackit.model.enums.Urgency;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class PriorityServiceTest {

    private final PriorityService priorityService = new PriorityService();

    @Test
    void high_impact_high_urgency_returns_p1() {
        assertEquals(Priority.P1, priorityService.calculatePriority(Impact.HIGH, Urgency.HIGH));
    }

    @Test
    void high_impact_medium_urgency_returns_p2() {
        assertEquals(Priority.P2, priorityService.calculatePriority(Impact.HIGH, Urgency.MEDIUM));
    }

    @Test
    void high_impact_low_urgency_returns_p2() {
        assertEquals(Priority.P2, priorityService.calculatePriority(Impact.HIGH, Urgency.LOW));
    }

    @Test
    void medium_impact_medium_urgency_returns_p3() {
        assertEquals(Priority.P3, priorityService.calculatePriority(Impact.MEDIUM, Urgency.MEDIUM));
    }

    @Test
    void medium_impact_low_urgency_returns_p3() {
        assertEquals(Priority.P3, priorityService.calculatePriority(Impact.MEDIUM, Urgency.LOW));
    }

    @Test
    void low_impact_low_urgency_returns_p4() {
        assertEquals(Priority.P4, priorityService.calculatePriority(Impact.LOW, Urgency.LOW));
    }

    @Test
    void low_impact_high_urgency_returns_p3() {
        assertEquals(Priority.P3, priorityService.calculatePriority(Impact.LOW, Urgency.HIGH));
    }

    @Test
    void low_impact_medium_urgency_returns_p4() {
        assertEquals(Priority.P4, priorityService.calculatePriority(Impact.LOW, Urgency.MEDIUM));
    }

    @Test
    void medium_impact_high_urgency_returns_p2() {
        assertEquals(Priority.P2, priorityService.calculatePriority(Impact.MEDIUM, Urgency.HIGH));
    }
}
