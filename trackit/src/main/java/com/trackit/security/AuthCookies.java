package com.trackit.security;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.util.WebUtils;

import java.time.Duration;
import java.util.Optional;

/**
 * Reads and writes the auth cookies. All are HttpOnly, so page scripts (and any injected XSS) can never read
 * a token. In production they are {@code Secure; SameSite=None; Partitioned}: the frontend and API live on
 * different sites, and partitioning keeps them usable where third-party cookies are otherwise blocked.
 */
@Component
public class AuthCookies {

    /** The refresh token is only ever sent to the auth endpoints. */
    public static final String REFRESH_TOKEN_PATH = "/api/auth";

    private final boolean secure;
    private final String accessTokenName;
    private final String refreshTokenName;
    private final String csrfTokenName;

    public AuthCookies(CookieProperties properties) {
        this.secure = properties.secure();
        // Browsers only accept these prefixes on Secure cookies; __Host- also forbids a Domain attribute
        String hostPrefix = secure ? "__Host-" : "";
        String securePrefix = secure ? "__Secure-" : "";
        this.accessTokenName = hostPrefix + "trackit_at";
        this.refreshTokenName = securePrefix + "trackit_rt";
        this.csrfTokenName = hostPrefix + "trackit_csrf";
    }

    public void setAccessToken(HttpServletResponse response, String token, Duration maxAge) {
        write(response, accessTokenName, token, "/", maxAge);
    }

    public void setRefreshToken(HttpServletResponse response, String token, Duration maxAge) {
        write(response, refreshTokenName, token, REFRESH_TOKEN_PATH, maxAge);
    }

    /** Session cookie; the frontend fetches a token on load. */
    public void setCsrfToken(HttpServletResponse response, String token) {
        write(response, csrfTokenName, token, "/", null);
    }

    public void clearAuthTokens(HttpServletResponse response) {
        write(response, accessTokenName, "", "/", Duration.ZERO);
        write(response, refreshTokenName, "", REFRESH_TOKEN_PATH, Duration.ZERO);
    }

    public void clearCsrfToken(HttpServletResponse response) {
        write(response, csrfTokenName, "", "/", Duration.ZERO);
    }

    public Optional<String> readAccessToken(HttpServletRequest request) {
        return read(request, accessTokenName);
    }

    public Optional<String> readRefreshToken(HttpServletRequest request) {
        return read(request, refreshTokenName);
    }

    public Optional<String> readCsrfToken(HttpServletRequest request) {
        return read(request, csrfTokenName);
    }

    private static Optional<String> read(HttpServletRequest request, String name) {
        Cookie cookie = WebUtils.getCookie(request, name);
        return Optional.ofNullable(cookie).map(Cookie::getValue).filter(StringUtils::hasText);
    }

    /** {@code maxAge} null writes a session cookie; zero deletes the cookie. */
    private void write(HttpServletResponse response, String name, String value, String path, Duration maxAge) {
        ResponseCookie.ResponseCookieBuilder builder = ResponseCookie.from(name, value)
                .httpOnly(true)
                .secure(secure)
                .path(path)
                .sameSite(secure ? "None" : "Lax");
        if (maxAge != null) {
            builder.maxAge(maxAge);
        }
        String header = builder.build().toString();
        // ResponseCookie has no Partitioned support before Spring Framework 6.2
        if (secure) {
            header += "; Partitioned";
        }
        response.addHeader(HttpHeaders.SET_COOKIE, header);
    }
}
