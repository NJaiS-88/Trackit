package com.trackit.security;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.validation.annotation.Validated;

import java.time.Duration;

/**
 * @param ttl               lifetime of each refresh token; rotation issues a fresh one (sliding session)
 * @param reuseGracePeriod  how long a just-rotated token may be replayed without being treated as stolen,
 *                          covering two tabs refreshing at the same moment
 * @param keyPrefix         prefix for every Redis key this app writes
 */
@Validated
@ConfigurationProperties(prefix = "security.refresh-token")
public record RefreshTokenProperties(
        @DefaultValue("7d") @NotNull Duration ttl,
        @DefaultValue("20s") @NotNull Duration reuseGracePeriod,
        @DefaultValue("trackit:") @NotBlank String keyPrefix
) {
}
