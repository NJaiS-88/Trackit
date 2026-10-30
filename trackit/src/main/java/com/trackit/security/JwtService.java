package com.trackit.security;

import com.trackit.model.Role;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.JwtParser;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

/**
 * Issues and verifies short-lived HS256 access tokens. They carry the user id and role, so requests are
 * authorized without a database lookup; deactivation takes effect when the token expires and the refresh
 * is refused.
 */
@Service
public class JwtService {

    private static final String ROLE_CLAIM = "role";
    private static final String TOKEN_USE_CLAIM = "token_use";
    private static final String ACCESS_TOKEN_USE = "access";
    private static final long CLOCK_SKEW_SECONDS = 30;

    private final SecretKey signingKey;
    private final JwtProperties properties;
    private final JwtParser parser;

    public JwtService(JwtProperties properties) {
        // Keys.hmacShaKeyFor rejects keys shorter than 256 bits
        this.signingKey = Keys.hmacShaKeyFor(Decoders.BASE64.decode(properties.secret()));
        this.properties = properties;
        this.parser = Jwts.parser()
                .verifyWith(signingKey)
                .requireIssuer(properties.issuer())
                .requireAudience(properties.audience())
                .require(TOKEN_USE_CLAIM, ACCESS_TOKEN_USE)
                .clockSkewSeconds(CLOCK_SKEW_SECONDS)
                .build();
    }

    public String generateAccessToken(String userId, Role role) {
        Instant now = Instant.now();
        return Jwts.builder()
                .id(UUID.randomUUID().toString())
                .issuer(properties.issuer())
                .audience().add(properties.audience()).and()
                .subject(userId)
                .claim(ROLE_CLAIM, role.name())
                .claim(TOKEN_USE_CLAIM, ACCESS_TOKEN_USE)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(properties.accessTokenTtl())))
                .signWith(signingKey, Jwts.SIG.HS256)
                .compact();
    }

    /**
     * @throws JwtException             if the token is malformed, tampered with, expired, or not an access token
     * @throws IllegalArgumentException if the subject or role claim is missing or unknown
     */
    public AuthenticatedUser parseAccessToken(String token) {
        Claims claims = parser.parseSignedClaims(token).getPayload();
        String userId = claims.getSubject();
        String role = claims.get(ROLE_CLAIM, String.class);
        if (userId == null || role == null) {
            throw new IllegalArgumentException("Access token is missing required claims");
        }
        return new AuthenticatedUser(userId, Role.valueOf(role));
    }

    public Duration getAccessTokenTtl() {
        return properties.accessTokenTtl();
    }
}
