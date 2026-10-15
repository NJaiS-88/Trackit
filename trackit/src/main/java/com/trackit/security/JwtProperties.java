package com.trackit.security;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/**
 * @param secret     Base64-encoded HMAC key (at least 256 bits)
 * @param expiration token lifetime in milliseconds
 */
@Validated
@ConfigurationProperties(prefix = "security.jwt")
public record JwtProperties(
        @NotBlank String secret,
        @Positive long expiration
) {
}
