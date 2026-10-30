package com.trackit.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/** Indexes are declared in {@link com.trackit.config.MongoConfig}. */
@Document(collection = "departments")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Department {

    @Id
    private String id;

    private String name;

    /** Lower-cased {@link #name}; unique so "IT" and "it" can't both exist. */
    private String nameKey;

    private String description;

    private Instant createdAt;

    /** Id of the admin who created the department. */
    private String createdBy;
}
