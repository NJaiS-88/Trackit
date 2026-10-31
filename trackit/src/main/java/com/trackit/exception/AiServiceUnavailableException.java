package com.trackit.exception;

/** The AI service could not be reached, timed out, or its model failed; the user can still fill the form in. */
public class AiServiceUnavailableException extends RuntimeException {

    public AiServiceUnavailableException() {
        super("The AI assistant is unavailable right now. Please fill in the form yourself or try again later.");
    }
}
