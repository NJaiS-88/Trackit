package com.trackit.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.trackit.dto.ApiErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.web.csrf.CsrfException;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * Writes {@link ApiErrorResponse} bodies for 401/403 raised inside the security filter chain,
 * which never reaches {@code @RestControllerAdvice}.
 */
@Component
@RequiredArgsConstructor
public class RestSecurityErrorHandler implements AuthenticationEntryPoint, AccessDeniedHandler {

    public static final String CSRF_TOKEN_INVALID = "CSRF_TOKEN_INVALID";
    public static final String ORIGIN_NOT_ALLOWED = "ORIGIN_NOT_ALLOWED";

    private final ObjectMapper objectMapper;

    @Override
    public void commence(HttpServletRequest request,
                         HttpServletResponse response,
                         AuthenticationException authException) throws IOException {
        write(request, response, HttpStatus.UNAUTHORIZED,
                "Authentication is required to access this resource", null);
    }

    @Override
    public void handle(HttpServletRequest request,
                       HttpServletResponse response,
                       AccessDeniedException accessDeniedException) throws IOException {
        if (accessDeniedException instanceof CsrfException) {
            write(request, response, HttpStatus.FORBIDDEN, "Invalid or missing CSRF token", CSRF_TOKEN_INVALID);
        } else {
            write(request, response, HttpStatus.FORBIDDEN,
                    "You do not have permission to access this resource", null);
        }
    }

    public void write(HttpServletRequest request, HttpServletResponse response,
                      HttpStatus status, String message, String code) throws IOException {
        ApiErrorResponse body = ApiErrorResponse.withCode(
                status.value(), status.getReasonPhrase(), message, request.getRequestURI(), code);
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(response.getOutputStream(), body);
    }
}
