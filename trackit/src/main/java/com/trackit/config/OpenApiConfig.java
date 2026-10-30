package com.trackit.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.info.Info;
import org.springframework.context.annotation.Configuration;

/**
 * Swagger UI is served from the API's own origin, so after {@code POST /api/auth/login} the browser sends the
 * auth cookies with every "Try it out" request; no Authorize step is needed.
 */
@Configuration
@OpenAPIDefinition(info = @Info(title = "Trackit API", version = "v1",
        description = "IT Incident Management System"))
public class OpenApiConfig {
}
