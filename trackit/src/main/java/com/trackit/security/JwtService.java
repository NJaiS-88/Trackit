package com.trackit.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.util.Date;

/**
 * Issues and verifies HS256-signed JWTs. The subject is the user id; the role and email are
 * embedded as claims so clients can read them without an extra round trip.
 */
@Service
public class JwtService {

    public static final String ROLE_CLAIM = "role";
    public static final String EMAIL_CLAIM = "email";

    private final SecretKey signingKey;
    private final long expirationMillis;

    public JwtService(JwtProperties properties) {
        // Keys.hmacShaKeyFor rejects keys shorter than 256 bits
        this.signingKey = Keys.hmacShaKeyFor(Decoders.BASE64.decode(properties.secret()));
        this.expirationMillis = properties.expiration();
    }

    public String generateToken(UserPrincipal principal) {
        Date issuedAt = new Date();
        Date expiresAt = new Date(issuedAt.getTime() + expirationMillis);

        return Jwts.builder()
                .subject(principal.getId())
                .claim(ROLE_CLAIM, principal.getRole().name())
                .claim(EMAIL_CLAIM, principal.getEmail())
                .issuedAt(issuedAt)
                .expiration(expiresAt)
                .signWith(signingKey, Jwts.SIG.HS256)
                .compact();
    }

    /**
     * @throws JwtException if the token is malformed, tampered with, or expired
     */
    public String extractUserId(String token) {
        return parseClaims(token).getSubject();
    }

    public boolean isTokenValid(String token, UserPrincipal principal) {
        try {
            Claims claims = parseClaims(token);
            return principal.getId().equals(claims.getSubject());
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    public long getExpirationSeconds() {
        return expirationMillis / 1000;
    }

    private Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
