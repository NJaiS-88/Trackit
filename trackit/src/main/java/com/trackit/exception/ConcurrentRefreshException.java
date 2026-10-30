package com.trackit.exception;

/** Another request rotated this refresh token moments ago; its response already carries the new cookies. */
public class ConcurrentRefreshException extends RuntimeException {

    public ConcurrentRefreshException() {
        super("The session was refreshed by another request");
    }
}
