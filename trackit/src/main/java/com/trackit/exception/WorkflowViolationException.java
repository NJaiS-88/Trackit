package com.trackit.exception;

/** An action that is not allowed in the incident's current workflow state. */
public class WorkflowViolationException extends RuntimeException {

    public WorkflowViolationException(String message) {
        super(message);
    }
}
