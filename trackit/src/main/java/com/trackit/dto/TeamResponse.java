package com.trackit.dto;

import java.util.List;

/** The Lead's department; {@code departmentId} is null (and the lists empty) until an admin assigns one. */
public record TeamResponse(
        String departmentId,
        String departmentName,
        List<TeamMemberResponse> members,
        List<ProjectResponse> projects
) {
}
