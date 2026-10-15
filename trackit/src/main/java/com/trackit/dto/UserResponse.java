package com.trackit.dto;

import com.trackit.model.Role;

import java.time.Instant;
import java.util.List;

public record UserResponse(
        String id,
        String name,
        String email,
        Role role,
        List<String> expertise,
        boolean active,
        Instant createdAt
) {
}
