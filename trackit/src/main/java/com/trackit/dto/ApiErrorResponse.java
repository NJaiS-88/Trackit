package com.trackit.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.Instant;
import java.util.Map;

/**
 * Uniform error body for every failed request.
 *
 * @param fieldErrors per-field validation messages; omitted from JSON when empty
 * @param code        stable machine-readable reason the SPA reacts to (e.g. {@code CSRF_TOKEN_INVALID});
 *                    omitted when absent
 */
@JsonInclude(JsonInclude.Include.NON_EMPTY)
public record ApiErrorResponse(
        Instant timestamp,
        int status,
        String error,
        String message,
        String path,
        Map<String, String> fieldErrors,
        String code
) {

    public static ApiErrorResponse of(int status, String error, String message, String path) {
        return new ApiErrorResponse(Instant.now(), status, error, message, path, null, null);
    }

    public static ApiErrorResponse of(int status, String error, String message, String path,
                                      Map<String, String> fieldErrors) {
        return new ApiErrorResponse(Instant.now(), status, error, message, path, fieldErrors, null);
    }

    public static ApiErrorResponse withCode(int status, String error, String message, String path, String code) {
        return new ApiErrorResponse(Instant.now(), status, error, message, path, null, code);
    }
}
