package com.trackit.exception;

/** A sign-up for this email is already waiting for admin approval. */
public class AccountRequestPendingException extends RuntimeException {

    public AccountRequestPendingException(String email) {
        super("An account request for '%s' is already awaiting admin approval".formatted(email));
    }
}
