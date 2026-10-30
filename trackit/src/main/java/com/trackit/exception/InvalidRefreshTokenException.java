package com.trackit.exception;

/** The refresh cookie is missing, expired, revoked or reused; the user has to sign in again. */
public class InvalidRefreshTokenException extends RuntimeException {

    public InvalidRefreshTokenException() {
        super("Your session has expired. Please sign in again.");
    }
}
