package com.trackit.security;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * @param secure true in production. Cross-site cookies must be {@code Secure; SameSite=None}; false falls back to
 *               {@code SameSite=Lax} without {@code Secure} for plain-http localhost development.
 */
@ConfigurationProperties(prefix = "security.cookies")
public record CookieProperties(@DefaultValue("true") boolean secure) {
}
