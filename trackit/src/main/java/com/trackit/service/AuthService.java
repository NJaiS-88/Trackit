package com.trackit.service;

import com.trackit.dto.AccountRequestResponse;
import com.trackit.dto.AuthResponse;
import com.trackit.dto.LoginRequest;
import com.trackit.dto.RegisterRequest;
import com.trackit.dto.UserSummary;
import com.trackit.exception.AccountNotApprovedException;
import com.trackit.exception.AccountRequestPendingException;
import com.trackit.exception.EmailAlreadyExistsException;
import com.trackit.model.AccountRequest;
import com.trackit.model.enums.AccountRequestStatus;
import com.trackit.repository.AccountRequestRepository;
import com.trackit.repository.UserRepository;
import com.trackit.security.JwtService;
import com.trackit.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final AccountRequestRepository accountRequestRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

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

    public AuthResponse login(LoginRequest request) {
        String email = normalizeEmail(request.email());
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(email, request.password()));
            return issueToken((UserPrincipal) authentication.getPrincipal());
        } catch (BadCredentialsException e) {
            rejectIfAwaitingApproval(email, request.password());
            throw e;
        }
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

    private AuthResponse issueToken(UserPrincipal principal) {
        String token = jwtService.generateToken(principal);
        UserSummary summary = new UserSummary(
                principal.getId(), principal.getName(), principal.getEmail(), principal.getRole());
        return AuthResponse.bearer(token, jwtService.getExpirationSeconds(), summary);
    }

    private static String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
