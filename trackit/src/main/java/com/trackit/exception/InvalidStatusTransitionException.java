package com.trackit.exception;

import com.trackit.model.enums.IncidentStatus;

public class InvalidStatusTransitionException extends RuntimeException {

    public InvalidStatusTransitionException(IncidentStatus current, IncidentStatus requested) {
        super("Transition from %s to %s is not allowed".formatted(current, requested));
    }
}
