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
 * Reads and writes the auth cookies. Both are HttpOnly, so page scripts (and any injected XSS) can never read
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

    public AuthCookies(CookieProperties properties) {
        this.secure = properties.secure();
        // Browsers only accept these prefixes on Secure cookies; __Host- also forbids a Domain attribute
        this.accessTokenName = (secure ? "__Host-" : "") + "trackit_at";
        this.refreshTokenName = (secure ? "__Secure-" : "") + "trackit_rt";
    }

    public void setAccessToken(HttpServletResponse response, String token, Duration maxAge) {
        write(response, accessTokenName, token, "/", maxAge);
    }

    public void setRefreshToken(HttpServletResponse response, String token, Duration maxAge) {
        write(response, refreshTokenName, token, REFRESH_TOKEN_PATH, maxAge);
    }

    public void clearAuthTokens(HttpServletResponse response) {
        write(response, accessTokenName, "", "/", Duration.ZERO);
        write(response, refreshTokenName, "", REFRESH_TOKEN_PATH, Duration.ZERO);
    }

    public Optional<String> readAccessToken(HttpServletRequest request) {
        return read(request, accessTokenName);
    }

    public Optional<String> readRefreshToken(HttpServletRequest request) {
        return read(request, refreshTokenName);
    }

    private static Optional<String> read(HttpServletRequest request, String name) {
        Cookie cookie = WebUtils.getCookie(request, name);
        return Optional.ofNullable(cookie).map(Cookie::getValue).filter(StringUtils::hasText);
    }

    /** {@code maxAge} zero deletes the cookie. */
    private void write(HttpServletResponse response, String name, String value, String path, Duration maxAge) {
        String header = ResponseCookie.from(name, value)
                .httpOnly(true)
                .secure(secure)
                .path(path)
                .sameSite(secure ? "None" : "Lax")
                .maxAge(maxAge)
                .build()
                .toString();
        // ResponseCookie has no Partitioned support before Spring Framework 6.2
        if (secure) {
            header += "; Partitioned";
        }
        response.addHeader(HttpHeaders.SET_COOKIE, header);
    }
}
