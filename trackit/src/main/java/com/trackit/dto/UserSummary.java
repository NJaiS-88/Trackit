package com.trackit.dto;

import com.trackit.model.Role;

/**
 * {@code employeeId} is the human-readable id, e.g. {@code EMP-000042};
 * {@code departmentName} is null when the user has no department (always null for admins);
 * {@code projectName} is null unless a Lead assigned the employee to a project.
 */
public record UserSummary(String id, String employeeId, String name, String email, Role role,
                          String departmentName, String projectName) {
}
