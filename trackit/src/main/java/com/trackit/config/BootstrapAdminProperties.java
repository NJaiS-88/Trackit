package com.trackit.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Admin account created at startup when no active admin exists. Leave email or password blank to skip.
 */
@ConfigurationProperties(prefix = "trackit.bootstrap-admin")
public record BootstrapAdminProperties(String name, String email, String password) {
}
