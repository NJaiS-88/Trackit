package com.trackit.config;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.validation.annotation.Validated;

import java.time.Duration;

/**
 * Connection to the Trackit AI service.
 *
 * @param baseUrl        e.g. {@code http://localhost:8000} or {@code https://trackit-ai.onrender.com}
 * @param serviceToken   sent as {@code X-Service-Token}; must match the AI service's SERVICE_TOKEN
 * @param connectTimeout how long to wait for a connection
 * @param timeout        how long to wait for an answer; covers a sleeping Render instance waking up, while staying
 *                       under the frontend's 60s request timeout
 */
@Validated
@ConfigurationProperties(prefix = "trackit.ai")
public record AiServiceProperties(
        @DefaultValue("http://localhost:8000") @NotBlank String baseUrl,
        @DefaultValue("") String serviceToken,
        @DefaultValue("10s") @NotNull Duration connectTimeout,
        @DefaultValue("55s") @NotNull Duration timeout
) {
}
