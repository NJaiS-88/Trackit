package com.trackit.dto;

import com.trackit.model.User;

public record TeamMemberResponse(
        String id,
        String name,
        String email,
        String projectId
) {

    public static TeamMemberResponse from(User user) {
        return new TeamMemberResponse(user.getId(), user.getName(), user.getEmail(), user.getProjectId());
    }
}
