package com.trackit.exception;

public class DepartmentAlreadyExistsException extends RuntimeException {

    public DepartmentAlreadyExistsException(String name) {
        super("A department named '%s' already exists".formatted(name));
    }
}
