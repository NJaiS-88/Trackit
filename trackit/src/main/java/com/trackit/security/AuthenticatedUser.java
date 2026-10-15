package com.trackit.security;

import com.trackit.model.Role;

public record AuthenticatedUser(String id, Role role) {
}
