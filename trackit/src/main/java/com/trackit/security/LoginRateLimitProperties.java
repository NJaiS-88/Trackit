package com.trackit.security;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.validation.annotation.Validated;

import java.time.Duration;

/**
 * @param maxFailures failed sign-ins allowed per email within {@code window} before further attempts are refused
 * @param window      counting window, starting at the first failure
 */
@Validated
@ConfigurationProperties(prefix = "security.login-rate-limit")
public record LoginRateLimitProperties(
        @DefaultValue("5") @Positive int maxFailures,
        @DefaultValue("15m") @NotNull Duration window
) {
}
