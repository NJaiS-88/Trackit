package com.trackit.validation;

import com.trackit.model.Role;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class RegistrationRoleValidator implements ConstraintValidator<RegistrationRole, Role> {

    @Override
    public boolean isValid(Role value, ConstraintValidatorContext context) {
        return value == null || value == Role.EMPLOYEE || value == Role.ADMIN;
    }
}
