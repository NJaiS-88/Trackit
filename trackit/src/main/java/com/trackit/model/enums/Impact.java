package com.trackit.model.enums;

import io.swagger.v3.oas.annotations.media.Schema;

/** How widely the incident affects people. The web form asks "Who is affected?" and maps each answer to one level. */
@Schema(description = """
        How widely the incident affects people ("Who is affected?").
        LOW = just the reporter; MEDIUM = the reporter's team or department;
        HIGH = several teams, the whole company, or a company-wide service.""")
public enum Impact {
    /** Several teams or the whole company. */
    HIGH,
    /** The reporter's team or department. */
    MEDIUM,
    /** Just the reporter. */
    LOW
}
