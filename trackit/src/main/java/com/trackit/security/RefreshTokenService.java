package com.trackit.security;

import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.RedisScript;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;

/**
 * Opaque, single-use refresh tokens stored in Redis. Only SHA-256 hashes are stored, so a leaked Redis
 * snapshot holds no usable tokens.
 *
 * <p>Each login starts a <em>family</em>; every refresh rotates to a new token in the same family. Presenting a
 * token that was already rotated means it was copied, so the whole family is revoked (both the thief and the
 * victim must sign in again). Keys, all under the configured prefix:
 * <ul>
 *   <li>{@code rt:<hash>} - hash {u: userId, f: familyId}, the live token</li>
 *   <li>{@code rt-used:<hash>} - hash {f: familyId, at: epochMillis}, a rotated token kept for reuse detection</li>
 *   <li>{@code fam:<familyId>} - hash of the family's live token</li>
 *   <li>{@code user-fams:<userId>} - set of the user's family ids, for "sign out everywhere"</li>
 * </ul>
 */
@Slf4j
@Service
public class RefreshTokenService {

    public enum Outcome {
        ROTATED,
        /** The token was rotated moments ago by a concurrent request; the caller already holds the new cookies. */
        CONCURRENT_REFRESH,
        REUSED,
        INVALID
    }

    public record RotationResult(Outcome outcome, String userId, String newToken) {
    }

    private static final SecureRandom RANDOM = new SecureRandom();

    // KEYS: user-fams. ARGV: prefix, tokenHash, userId, familyId, ttlSeconds
    private static final RedisScript<String> ISSUE = RedisScript.of("""
            local tokenKey = ARGV[1] .. 'rt:' .. ARGV[2]
            redis.call('HSET', tokenKey, 'u', ARGV[3], 'f', ARGV[4])
            redis.call('EXPIRE', tokenKey, ARGV[5])
            redis.call('SET', ARGV[1] .. 'fam:' .. ARGV[4], ARGV[2], 'EX', ARGV[5])
            redis.call('SADD', KEYS[1], ARGV[4])
            redis.call('EXPIRE', KEYS[1], ARGV[5])
            return 'OK'
            """, String.class);

    // KEYS: rt:<old>, rt-used:<old>. ARGV: prefix, newHash, ttlSeconds, graceMillis, nowMillis
    private static final RedisScript<String> ROTATE = RedisScript.of("""
            local entry = redis.call('HMGET', KEYS[1], 'u', 'f')
            local userId, familyId = entry[1], entry[2]
            if userId and familyId then
              local ttl = ARGV[3]
              local newKey = ARGV[1] .. 'rt:' .. ARGV[2]
              redis.call('DEL', KEYS[1])
              redis.call('HSET', newKey, 'u', userId, 'f', familyId)
              redis.call('EXPIRE', newKey, ttl)
              redis.call('HSET', KEYS[2], 'f', familyId, 'at', ARGV[5])
              redis.call('EXPIRE', KEYS[2], ttl)
              redis.call('SET', ARGV[1] .. 'fam:' .. familyId, ARGV[2], 'EX', ttl)
              local userFamilies = ARGV[1] .. 'user-fams:' .. userId
              redis.call('SADD', userFamilies, familyId)
              redis.call('EXPIRE', userFamilies, ttl)
              return 'ROTATED|' .. userId
            end
            local used = redis.call('HMGET', KEYS[2], 'f', 'at')
            if used[1] and used[2] then
              if tonumber(ARGV[5]) - tonumber(used[2]) <= tonumber(ARGV[4]) then
                return 'CONCURRENT_REFRESH|'
              end
              local familyKey = ARGV[1] .. 'fam:' .. used[1]
              local current = redis.call('GET', familyKey)
              if current then redis.call('DEL', ARGV[1] .. 'rt:' .. current) end
              redis.call('DEL', familyKey)
              return 'REUSED|'
            end
            return 'INVALID|'
            """, String.class);

    // KEYS: rt:<hash>, rt-used:<hash>. ARGV: prefix
    private static final RedisScript<Long> REVOKE_FAMILY = RedisScript.of("""
            local entry = redis.call('HMGET', KEYS[1], 'u', 'f')
            local userId, familyId = entry[1], entry[2]
            if not familyId then familyId = redis.call('HGET', KEYS[2], 'f') end
            redis.call('DEL', KEYS[1])
            if not familyId then return 0 end
            local familyKey = ARGV[1] .. 'fam:' .. familyId
            local current = redis.call('GET', familyKey)
            if current then redis.call('DEL', ARGV[1] .. 'rt:' .. current) end
            redis.call('DEL', familyKey)
            if userId then redis.call('SREM', ARGV[1] .. 'user-fams:' .. userId, familyId) end
            return 1
            """, Long.class);

    // KEYS: user-fams:<userId>. ARGV: prefix
    private static final RedisScript<Long> REVOKE_ALL = RedisScript.of("""
            local families = redis.call('SMEMBERS', KEYS[1])
            for _, familyId in ipairs(families) do
              local familyKey = ARGV[1] .. 'fam:' .. familyId
              local current = redis.call('GET', familyKey)
              if current then redis.call('DEL', ARGV[1] .. 'rt:' .. current) end
              redis.call('DEL', familyKey)
            end
            redis.call('DEL', KEYS[1])
            return #families
            """, Long.class);

    private final StringRedisTemplate redis;
    private final RefreshTokenProperties properties;
    private final String prefix;

    public RefreshTokenService(StringRedisTemplate redis, RefreshTokenProperties properties) {
        this.redis = redis;
        this.properties = properties;
        this.prefix = properties.keyPrefix();
    }

    /** Starts a new session family and returns its first raw token (only ever sent to the browser as a cookie). */
    public String issue(String userId) {
        String token = randomToken();
        redis.execute(ISSUE, List.of(userFamiliesKey(userId)),
                prefix, hash(token), userId, randomToken(), ttlSeconds());
        return token;
    }

    public RotationResult rotate(String rawToken) {
        String oldHash = hash(rawToken);
        String newToken = randomToken();
        String result = redis.execute(ROTATE, List.of(tokenKey(oldHash), usedKey(oldHash)),
                prefix, hash(newToken), ttlSeconds(),
                String.valueOf(properties.reuseGracePeriod().toMillis()), String.valueOf(System.currentTimeMillis()));

        String[] parts = String.valueOf(result).split("\\|", 2);
        Outcome outcome = Outcome.valueOf(parts[0]);
        if (outcome == Outcome.REUSED) {
            log.warn("Refresh token reuse detected; revoked its session family");
        }
        return outcome == Outcome.ROTATED
                ? new RotationResult(outcome, parts[1], newToken)
                : new RotationResult(outcome, null, null);
    }

    /** Signs out the session that owns this token, even if the token was already rotated. */
    public void revoke(String rawToken) {
        String tokenHash = hash(rawToken);
        redis.execute(REVOKE_FAMILY, List.of(tokenKey(tokenHash), usedKey(tokenHash)), prefix);
    }

    /** Signs the user out on every device. */
    public void revokeAllForUser(String userId) {
        redis.execute(REVOKE_ALL, List.of(userFamiliesKey(userId)), prefix);
    }

    private String tokenKey(String tokenHash) {
        return prefix + "rt:" + tokenHash;
    }

    private String usedKey(String tokenHash) {
        return prefix + "rt-used:" + tokenHash;
    }

    private String userFamiliesKey(String userId) {
        return prefix + "user-fams:" + userId;
    }

    private String ttlSeconds() {
        return String.valueOf(properties.ttl().toSeconds());
    }

    private static String randomToken() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    static String hash(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is unavailable", e);
        }
    }
}
