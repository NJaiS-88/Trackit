package com.trackit.controller;

import com.trackit.dto.AccountRequestResponse;
import com.trackit.dto.CsrfTokenResponse;
import com.trackit.dto.LoginRequest;
import com.trackit.dto.RegisterRequest;
import com.trackit.dto.UserSummary;
import com.trackit.security.AuthCookies;
import com.trackit.security.CookieCsrfTokenStore;
import com.trackit.security.CurrentUser;
import com.trackit.security.JwtService;
import com.trackit.security.RefreshTokenProperties;
import com.trackit.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Tokens travel only in HttpOnly cookies. Every POST here, login included, needs the {@code X-XSRF-TOKEN}
 * header from {@code GET /api/auth/csrf}.
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "Cookie-based sessions: CSRF token, login, refresh, logout")
public class AuthController {

    private final AuthService authService;
    private final AuthCookies authCookies;
    private final CookieCsrfTokenStore csrfTokenStore;
    private final JwtService jwtService;
    private final RefreshTokenProperties refreshTokenProperties;

    @GetMapping("/csrf")
    @Operation(summary = "Get a CSRF token to send in the X-XSRF-TOKEN header")
    public CsrfTokenResponse csrf(CsrfToken csrfToken) {
        return new CsrfTokenResponse(csrfToken.getHeaderName(), csrfToken.getToken());
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.ACCEPTED)
    @Operation(summary = "Request an employee account; an admin must approve it before you can log in")
    public AccountRequestResponse register(@Valid @RequestBody RegisterRequest request) {
        return authService.register(request);
    }

    @PostMapping("/login")
    @Operation(summary = "Log in; sets the access and refresh cookies and rotates the CSRF token")
    public UserSummary login(@Valid @RequestBody LoginRequest request,
                             HttpServletRequest httpRequest, HttpServletResponse httpResponse) {
        AuthService.Session session = authService.login(request);
        writeSession(session, httpResponse);
        // A fresh CSRF token after the privilege change; the SPA fetches a new one on its next write
        csrfTokenStore.saveToken(null, httpRequest, httpResponse);
        return session.user();
    }

    @PostMapping("/refresh")
    @Operation(summary = "Rotate the refresh token and issue a new access token")
    public UserSummary refresh(HttpServletRequest httpRequest, HttpServletResponse httpResponse) {
        AuthService.Session session = authService.refresh(authCookies.readRefreshToken(httpRequest).orElse(null));
        writeSession(session, httpResponse);
        return session.user();
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Revoke this session and clear the auth cookies")
    public void logout(HttpServletRequest httpRequest, HttpServletResponse httpResponse) {
        authService.logout(authCookies.readRefreshToken(httpRequest).orElse(null));
        authCookies.clearAuthTokens(httpResponse);
        csrfTokenStore.saveToken(null, httpRequest, httpResponse);
    }

    @GetMapping("/me")
    @Operation(summary = "The signed-in user")
    public UserSummary me() {
        return authService.getCurrentUser(CurrentUser.get().id());
    }

    private void writeSession(AuthService.Session session, HttpServletResponse response) {
        authCookies.setAccessToken(response, session.accessToken(), jwtService.getAccessTokenTtl());
        authCookies.setRefreshToken(response, session.refreshToken(), refreshTokenProperties.ttl());
    }
}
