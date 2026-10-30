package com.trackit.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeIn;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import org.springframework.context.annotation.Configuration;

/**
 * Swagger UI is served from the API's own origin, so the auth cookies are sent automatically after
 * {@code POST /api/auth/login}. Writes still need the CSRF header: call {@code GET /api/auth/csrf} and paste the
 * token into "Authorize".
 */
@Configuration
@OpenAPIDefinition(info = @Info(title = "Trackit API", version = "v1",
        description = "IT Incident Management System"))
@SecurityScheme(name = OpenApiConfig.CSRF_SCHEME, type = SecuritySchemeType.APIKEY,
        in = SecuritySchemeIn.HEADER, paramName = "X-XSRF-TOKEN",
        description = "Token from GET /api/auth/csrf")
public class OpenApiConfig {

    public static final String CSRF_SCHEME = "csrfToken";
}
