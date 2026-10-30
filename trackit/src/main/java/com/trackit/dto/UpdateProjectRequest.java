package com.trackit.dto;

/** {@code projectId} null or blank removes the employee from their project. */
public record UpdateProjectRequest(
        String projectId
) {
}
