package com.trackit.exception;

public class ProjectAlreadyExistsException extends RuntimeException {

    public ProjectAlreadyExistsException(String name) {
        super("Your department already has a project named '%s'".formatted(name));
    }
}
