package com.trackit.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/** Sign-up may only create an employee or an admin. Engineers are assigned later. */
@Documented
@Constraint(validatedBy = RegistrationRoleValidator.class)
@Target(ElementType.FIELD)
@Retention(RetentionPolicy.RUNTIME)
public @interface RegistrationRole {

    String message() default "Role must be Employee or Admin";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
