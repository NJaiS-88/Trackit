package com.trackit.model;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/** Atomic sequence (e.g. {@code incident-2026}) incremented with findAndModify. */
@Document(collection = "counters")
@Getter
@Setter
@NoArgsConstructor
public class Counter {

    @Id
    private String id;

    private long seq;
}
