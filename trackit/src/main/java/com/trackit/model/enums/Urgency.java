package com.trackit.model.enums;

import io.swagger.v3.oas.annotations.media.Schema;

/** How badly the incident stops work. The web form asks "Can you keep working?" and maps each answer to one level. */
@Schema(description = """
        How badly the incident stops work ("Can you keep working?").
        LOW = yes, it is an annoyance; MEDIUM = partly, there is a workaround;
        HIGH = no, the affected people are completely blocked.""")
public enum Urgency {
    /** Completely blocked; no workaround. */
    HIGH,
    /** Can keep working with a workaround. */
    MEDIUM,
    /** An annoyance; work continues as normal. */
    LOW
}
