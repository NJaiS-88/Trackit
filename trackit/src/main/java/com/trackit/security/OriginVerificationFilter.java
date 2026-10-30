package com.trackit.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.CorsUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Set;

/**
 * CSRF defence in depth: browsers always send {@code Origin} on cross-origin state-changing requests, so any
 * such request from a site outside the CORS allowlist is refused before it reaches the CSRF check.
 * Requests without {@code Origin} (curl, server-to-server) still need a valid CSRF token.
 */
@Component
@RequiredArgsConstructor
public class OriginVerificationFilter extends OncePerRequestFilter {

    private static final Set<String> SAFE_METHODS = Set.of("GET", "HEAD", "OPTIONS", "TRACE");

    private final CorsConfigurationSource corsConfigurationSource;
    private final RestSecurityErrorHandler errorHandler;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return SAFE_METHODS.contains(request.getMethod());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String origin = request.getHeader(HttpHeaders.ORIGIN);
        if (origin == null || !CorsUtils.isCorsRequest(request) || isAllowed(request, origin)) {
            filterChain.doFilter(request, response);
            return;
        }
        errorHandler.write(request, response, HttpStatus.FORBIDDEN,
                "Requests from this origin are not allowed", RestSecurityErrorHandler.ORIGIN_NOT_ALLOWED);
    }

    private boolean isAllowed(HttpServletRequest request, String origin) {
        CorsConfiguration config = corsConfigurationSource.getCorsConfiguration(request);
        return config != null && config.checkOrigin(origin) != null;
    }
}
