package com.trackit.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.security.web.csrf.CsrfTokenRepository;
import org.springframework.security.web.csrf.DefaultCsrfToken;
import org.springframework.stereotype.Component;

import java.security.SecureRandom;
import java.util.Base64;

/**
 * Double-submit CSRF: the token lives in an HttpOnly cookie and the SPA sends it back in a header. The SPA
 * cannot read the cookie (it is on the API's domain), so it gets the token from {@code GET /api/auth/csrf},
 * which CORS only lets the allowed frontend origins read.
 */
@Component
@RequiredArgsConstructor
public class CookieCsrfTokenStore implements CsrfTokenRepository {

    public static final String HEADER_NAME = "X-XSRF-TOKEN";
    private static final String PARAMETER_NAME = "_csrf";
    private static final SecureRandom RANDOM = new SecureRandom();

    private final AuthCookies authCookies;

    @Override
    public CsrfToken generateToken(HttpServletRequest request) {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return new DefaultCsrfToken(HEADER_NAME, PARAMETER_NAME, Base64.getUrlEncoder().withoutPadding().encodeToString(bytes));
    }

    @Override
    public void saveToken(CsrfToken token, HttpServletRequest request, HttpServletResponse response) {
        if (token == null) {
            authCookies.clearCsrfToken(response);
        } else {
            authCookies.setCsrfToken(response, token.getToken());
        }
    }

    @Override
    public CsrfToken loadToken(HttpServletRequest request) {
        return authCookies.readCsrfToken(request)
                .map(value -> new DefaultCsrfToken(HEADER_NAME, PARAMETER_NAME, value))
                .orElse(null);
    }
}
