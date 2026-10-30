package com.trackit.model;

import com.trackit.model.enums.ProjectStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/** A project inside one {@link Department}, created by that department's Lead. Indexes are in MongoConfig. */
@Document(collection = "projects")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Project {

    @Id
    private String id;

    private String name;

    /** Lower-cased {@link #name}; unique within a department. */
    private String nameKey;

    private String departmentId;

    @Builder.Default
    private ProjectStatus status = ProjectStatus.ACTIVE;

    private Instant createdAt;

    /** Id of the Lead who created the project. */
    private String createdBy;
}
