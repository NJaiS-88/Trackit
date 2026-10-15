package com.trackit.service;

import com.trackit.dto.AuthResponse;
import com.trackit.dto.LoginRequest;
import com.trackit.dto.RegisterRequest;
import com.trackit.dto.UserSummary;
import com.trackit.exception.EmailAlreadyExistsException;
import com.trackit.model.Role;
import com.trackit.model.User;
import com.trackit.repository.UserRepository;
import com.trackit.security.JwtService;
import com.trackit.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    /**
     * Self-registration always creates an {@link Role#EMPLOYEE}; elevated roles are granted by an admin.
     */
    public AuthResponse register(RegisterRequest request) {
        String email = normalizeEmail(request.email());
        if (userRepository.existsByEmail(email)) {
            throw new EmailAlreadyExistsException(email);
        }

        User user = User.builder()
                .name(request.name().trim())
                .email(email)
                .password(passwordEncoder.encode(request.password()))
                .role(Role.EMPLOYEE)
                .expertise(normalizeExpertise(request.expertise()))
                .active(true)
                .createdAt(Instant.now())
                .build();

        try {
            user = userRepository.save(user);
        } catch (DuplicateKeyException e) {
            // Concurrent registration slipped past the existsByEmail check; the unique index caught it
            throw new EmailAlreadyExistsException(email);
        }

        return issueToken(UserPrincipal.from(user));
    }

    public AuthResponse login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(normalizeEmail(request.email()), request.password()));

        return issueToken((UserPrincipal) authentication.getPrincipal());
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

    /** Trims entries and drops duplicates while keeping the caller's order. */
    private static List<String> normalizeExpertise(List<String> expertise) {
        if (expertise == null) {
            return new ArrayList<>();
        }
        return new ArrayList<>(expertise.stream()
                .map(String::trim)
                .collect(LinkedHashSet::new, LinkedHashSet::add, LinkedHashSet::addAll));
    }
}
