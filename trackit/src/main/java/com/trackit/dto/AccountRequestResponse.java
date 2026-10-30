package com.trackit.dto;

import com.trackit.model.AccountRequest;
import com.trackit.model.enums.AccountRequestStatus;

import java.time.Instant;

public record AccountRequestResponse(
        String id,
        String name,
        String email,
        AccountRequestStatus status,
        Instant createdAt,
        Instant reviewedAt
) {

    public static AccountRequestResponse from(AccountRequest request) {
        return new AccountRequestResponse(
                request.getId(),
                request.getName(),
                request.getEmail(),
                request.getStatus(),
                request.getCreatedAt(),
                request.getReviewedAt());
    }
}
