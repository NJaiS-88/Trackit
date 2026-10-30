package com.trackit.security;

import com.trackit.exception.TooManyLoginAttemptsException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.RedisScript;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.concurrent.TimeUnit;

/**
 * Counts failed sign-ins per email in Redis and refuses further attempts once the limit is hit, until the
 * window (started by the first failure) expires. Keyed by email rather than IP: the client IP seen behind
 * the hosting proxy can be spoofed through X-Forwarded-For. Emails are hashed so Redis holds no addresses.
 */
@Service
@RequiredArgsConstructor
public class LoginRateLimiter {

    // INCR and set the expiry atomically, so a crash can never leave a counter without a TTL
    private static final RedisScript<Long> RECORD_FAILURE = RedisScript.of("""
            local count = redis.call('INCR', KEYS[1])
            if count == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
            return count
            """, Long.class);

    private final StringRedisTemplate redis;
    private final LoginRateLimitProperties properties;
    private final RefreshTokenProperties refreshTokenProperties;

    /** @throws TooManyLoginAttemptsException if this email has reached the failure limit */
    public void checkAllowed(String email) {
        String key = key(email);
        String failures = redis.opsForValue().get(key);
        if (failures != null && Long.parseLong(failures) >= properties.maxFailures()) {
            Long retryAfter = redis.getExpire(key, TimeUnit.SECONDS);
            throw new TooManyLoginAttemptsException(retryAfter == null || retryAfter < 1 ? 1 : retryAfter);
        }
    }

    public void recordFailure(String email) {
        redis.execute(RECORD_FAILURE, List.of(key(email)), String.valueOf(properties.window().toMillis()));
    }

    public void reset(String email) {
        redis.delete(key(email));
    }

    private String key(String email) {
        return refreshTokenProperties.keyPrefix() + "login-fail:" + RefreshTokenService.hash(email);
    }
}
