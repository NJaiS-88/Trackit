package com.trackit.config;

import com.trackit.model.Role;
import com.trackit.model.User;
import com.trackit.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Locale;

/** Sign-up needs an admin to approve it, so the very first admin has to come from configuration. */
@Slf4j
@Component
@RequiredArgsConstructor
public class AdminBootstrap {

    private static final int MIN_PASSWORD_LENGTH = 8;

    private final BootstrapAdminProperties properties;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @EventListener(ApplicationReadyEvent.class)
    public void ensureAdminExists() {
        if (!StringUtils.hasText(properties.email()) || !StringUtils.hasText(properties.password())) {
            return;
        }
        if (userRepository.countByRoleAndActiveTrue(Role.ADMIN) > 0) {
            return;
        }
        if (properties.password().length() < MIN_PASSWORD_LENGTH) {
            log.warn("ADMIN_PASSWORD must be at least {} characters; skipping admin bootstrap", MIN_PASSWORD_LENGTH);
            return;
        }

        String email = properties.email().trim().toLowerCase(Locale.ROOT);
        User admin = userRepository.findByEmail(email).orElse(null);
        if (admin != null) {
            // Promote rather than overwrite: the existing password stays in effect
            admin.setRole(Role.ADMIN);
            admin.setActive(true);
            userRepository.save(admin);
            log.info("No active admin found; promoted existing user {} to ADMIN", email);
            return;
        }

        userRepository.save(User.builder()
                .name(StringUtils.hasText(properties.name()) ? properties.name().trim() : "Administrator")
                .email(email)
                .password(passwordEncoder.encode(properties.password()))
                .role(Role.ADMIN)
                .expertise(new ArrayList<>())
                .active(true)
                .createdAt(Instant.now())
                .build());
        log.info("No active admin found; created admin account {}", email);
    }
}
