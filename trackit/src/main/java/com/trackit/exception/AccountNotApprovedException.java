package com.trackit.exception;

/** Correct credentials, but they belong to an account request that is not approved. */
public class AccountNotApprovedException extends RuntimeException {

    public AccountNotApprovedException(String message) {
        super(message);
    }
}
