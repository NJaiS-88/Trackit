package com.trackit.security;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.validation.annotation.Validated;

import java.time.Duration;

/**
 * @param secret         Base64-encoded HMAC key (at least 256 bits)
 * @param issuer         {@code iss} claim written and required on every access token
 * @param audience       {@code aud} claim written and required on every access token
 * @param accessTokenTtl access-token lifetime
 */
@Validated
@ConfigurationProperties(prefix = "security.jwt")
public record JwtProperties(
        @NotBlank String secret,
        @DefaultValue("trackit-api") @NotBlank String issuer,
        @DefaultValue("trackit-web") @NotBlank String audience,
        @DefaultValue("10m") @NotNull Duration accessTokenTtl
) {
}
