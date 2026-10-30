package com.trackit.dto;

import com.trackit.model.Role;

import java.time.Instant;

public record UserResponse(
        String id,
        String name,
        String email,
        Role role,
        String departmentId,
        boolean active,
        Instant createdAt
) {
}
