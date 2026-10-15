package com.trackit.dto;

import com.trackit.model.Role;

public record UserSummary(String id, String name, String email, Role role) {
}
