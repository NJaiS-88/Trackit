package com.trackit.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "users")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    private String id;

    private String name;

    @Indexed(unique = true)
    private String email;

    /** BCrypt hash, never the raw password. */
    private String password;

    private Role role;

    @Builder.Default
    private List<String> expertise = new ArrayList<>();

    /** Id of the user's {@link Department}; null until an admin assigns one. */
    private String departmentId;

    @Builder.Default
    private boolean active = true;

    private Instant createdAt;
}
