package com.trackit.dto;

import com.trackit.model.Department;

import java.time.Instant;

public record DepartmentResponse(
        String id,
        String name,
        String description,
        Instant createdAt
) {

    public static DepartmentResponse from(Department department) {
        return new DepartmentResponse(
                department.getId(),
                department.getName(),
                department.getDescription(),
                department.getCreatedAt());
    }
}
