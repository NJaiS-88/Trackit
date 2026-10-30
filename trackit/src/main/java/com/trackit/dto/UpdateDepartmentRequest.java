package com.trackit.dto;

/** {@code departmentId} null or blank removes the user from their department. */
public record UpdateDepartmentRequest(
        String departmentId
) {
}
