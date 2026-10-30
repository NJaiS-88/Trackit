package com.trackit.service;

import com.trackit.dto.AccountRequestResponse;
import com.trackit.dto.LoginRequest;
import com.trackit.dto.RegisterRequest;
import com.trackit.dto.UserSummary;
import com.trackit.exception.AccountNotApprovedException;
import com.trackit.exception.AccountRequestPendingException;
import com.trackit.exception.ConcurrentRefreshException;
import com.trackit.exception.EmailAlreadyExistsException;
import com.trackit.exception.InvalidRefreshTokenException;
import com.trackit.exception.ResourceNotFoundException;
import com.trackit.model.AccountRequest;
import com.trackit.model.User;
import com.trackit.model.enums.AccountRequestStatus;
import com.trackit.repository.AccountRequestRepository;
import com.trackit.repository.UserRepository;
import com.trackit.security.JwtService;
import com.trackit.security.LoginRateLimiter;
import com.trackit.security.RefreshTokenService;
import com.trackit.security.RefreshTokenService.RotationResult;
import com.trackit.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class AuthService {

    /** Tokens to set as cookies; never returned in a response body. */
    public record Session(UserSummary user, String accessToken, String refreshToken) {
    }

    private final UserRepository userRepository;
    private final AccountRequestRepository accountRequestRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;
    private final LoginRateLimiter loginRateLimiter;

    /** Sign-up only files a request; an admin approves it into an EMPLOYEE account. */
    public AccountRequestResponse register(RegisterRequest request) {
        String email = normalizeEmail(request.email());
        if (userRepository.existsByEmail(email)) {
            throw new EmailAlreadyExistsException(email);
        }
        if (accountRequestRepository.existsByEmailAndStatus(email, AccountRequestStatus.PENDING)) {
            throw new AccountRequestPendingException(email);
        }

        AccountRequest accountRequest = AccountRequest.builder()
                .name(request.name().trim())
                .email(email)
                .password(passwordEncoder.encode(request.password()))
                .status(AccountRequestStatus.PENDING)
                .createdAt(Instant.now())
                .build();

        try {
            accountRequest = accountRequestRepository.save(accountRequest);
        } catch (DuplicateKeyException e) {
            // Concurrent submission slipped past the exists check; the partial unique index caught it
            throw new AccountRequestPendingException(email);
        }
        return AccountRequestResponse.from(accountRequest);
    }

    public Session login(LoginRequest request) {
        String email = normalizeEmail(request.email());
        loginRateLimiter.checkAllowed(email);

        UserPrincipal principal;
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(email, request.password()));
            principal = (UserPrincipal) authentication.getPrincipal();
        } catch (BadCredentialsException e) {
            loginRateLimiter.recordFailure(email);
            rejectIfAwaitingApproval(email, request.password());
            throw e;
        }
        loginRateLimiter.reset(email);

        UserSummary user = new UserSummary(principal.getId(), principal.getName(), principal.getEmail(), principal.getRole());
        return new Session(user,
                jwtService.generateAccessToken(principal.getId(), principal.getRole()),
                refreshTokenService.issue(principal.getId()));
    }

    /**
     * Rotates the refresh token and re-reads the user, so deactivation and role changes apply at the next refresh.
     *
     * @throws InvalidRefreshTokenException the user must sign in again
     * @throws ConcurrentRefreshException   another request already rotated this token moments ago
     */
    public Session refresh(String rawRefreshToken) {
        if (!StringUtils.hasText(rawRefreshToken)) {
            throw new InvalidRefreshTokenException();
        }

        RotationResult rotation = refreshTokenService.rotate(rawRefreshToken);
        switch (rotation.outcome()) {
            case CONCURRENT_REFRESH -> throw new ConcurrentRefreshException();
            case REUSED, INVALID -> throw new InvalidRefreshTokenException();
            case ROTATED -> { /* continue */ }
        }

        User user = userRepository.findById(rotation.userId()).filter(User::isActive).orElse(null);
        if (user == null) {
            refreshTokenService.revokeAllForUser(rotation.userId());
            throw new InvalidRefreshTokenException();
        }
        return new Session(toSummary(user),
                jwtService.generateAccessToken(user.getId(), user.getRole()),
                rotation.newToken());
    }

    public void logout(String rawRefreshToken) {
        if (StringUtils.hasText(rawRefreshToken)) {
            refreshTokenService.revoke(rawRefreshToken);
        }
    }

    public UserSummary getCurrentUser(String userId) {
        return userRepository.findById(userId)
                .map(AuthService::toSummary)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));
    }

    /** Only explains the request state when the password matches, so it reveals nothing to a stranger. */
    private void rejectIfAwaitingApproval(String email, String rawPassword) {
        accountRequestRepository.findFirstByEmailOrderByCreatedAtDesc(email)
                .filter(r -> r.getStatus() != AccountRequestStatus.APPROVED)
                .filter(r -> r.getPassword() != null && passwordEncoder.matches(rawPassword, r.getPassword()))
                .ifPresent(r -> {
                    throw new AccountNotApprovedException(r.getStatus() == AccountRequestStatus.PENDING
                            ? "Your account request is awaiting admin approval"
                            : "Your account request was rejected by an administrator");
                });
    }

    private static UserSummary toSummary(User user) {
        return new UserSummary(user.getId(), user.getName(), user.getEmail(), user.getRole());
    }

    private static String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
