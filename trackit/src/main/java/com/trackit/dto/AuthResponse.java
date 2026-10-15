package com.trackit.dto;

/**
 * @param expiresIn token lifetime in seconds
 */
public record AuthResponse(
        String token,
        String tokenType,
        long expiresIn,
        UserSummary user
) {

    public static AuthResponse bearer(String token, long expiresInSeconds, UserSummary user) {
        return new AuthResponse(token, "Bearer", expiresInSeconds, user);
    }
}
