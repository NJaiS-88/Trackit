package com.trackit.model;

import com.trackit.model.enums.AccountRequestStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Version;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/** A sign-up waiting for an admin; approving it creates the {@link User}. */
@Document(collection = "account_requests")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AccountRequest {

    @Id
    private String id;

    private String name;

    private String email;

    /** BCrypt hash, never the raw password. Cleared once the request is approved. */
    private String password;

    @Builder.Default
    private AccountRequestStatus status = AccountRequestStatus.PENDING;

    private Instant createdAt;

    private Instant reviewedAt;

    /** Id of the admin who approved or rejected the request. */
    private String reviewedBy;

    @Version
    private Long version;
}
