package com.trackit.model.enums;

public enum SlaStatus {
    /** Clock running, plenty of time left. */
    NORMAL,
    /** Clock running, less than the due-soon share of the target left. */
    DUE_SOON,
    /** Past the deadline. Stays BREACHED even after the incident is resolved. */
    BREACHED,
    /** Resolved before the deadline. */
    MET
}
