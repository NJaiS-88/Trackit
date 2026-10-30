package com.trackit.service;

import com.trackit.dto.UserResponse;
import com.trackit.exception.ResourceNotFoundException;
import com.trackit.model.Role;
import com.trackit.model.User;
import com.trackit.repository.DepartmentRepository;
import com.trackit.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final DepartmentRepository departmentRepository;

    public Page<UserResponse> getAllUsers(Pageable pageable) {
        return userRepository.findAll(pageable).map(this::toResponse);
    }

    public UserResponse getUserById(String id) {
        return toResponse(findUser(id));
    }

    public UserResponse updateRole(String userId, Role newRole) {
        User user = findUser(userId);
        if (user.getRole() == newRole) {
            return toResponse(user);
        }
        if (user.getRole() == Role.ADMIN && user.isActive()) {
            ensureAnotherActiveAdminExists("Cannot change the role of the last active admin");
        }
        user.setRole(newRole);
        if (newRole == Role.ADMIN) {
            user.setDepartmentId(null);
        }
        return toResponse(userRepository.save(user));
    }

    /** {@code departmentId} null or blank clears the user's department. Admins never belong to one. */
    public UserResponse updateDepartment(String userId, String departmentId) {
        User user = findUser(userId);
        String newDepartmentId = StringUtils.hasText(departmentId) ? departmentId.trim() : null;
        if (Objects.equals(user.getDepartmentId(), newDepartmentId)) {
            return toResponse(user);
        }
        if (user.getRole() == Role.ADMIN && newDepartmentId != null) {
            throw new IllegalArgumentException("Admins cannot belong to a department");
        }
        if (newDepartmentId != null && !departmentRepository.existsById(newDepartmentId)) {
            throw new ResourceNotFoundException("Department", "id", newDepartmentId);
        }
        user.setDepartmentId(newDepartmentId);
        return toResponse(userRepository.save(user));
    }

    public UserResponse toggleStatus(String userId) {
        User user = findUser(userId);
        if (user.isActive() && user.getRole() == Role.ADMIN) {
            ensureAnotherActiveAdminExists("Cannot deactivate the last active admin");
        }
        user.setActive(!user.isActive());
        return toResponse(userRepository.save(user));
    }

    /** Active engineers whose expertise list contains {@code category} (exact match). */
    public List<UserResponse> getEngineersByExpertise(String category) {
        return userRepository.findByRoleAndExpertiseContaining(Role.ENGINEER, category).stream()
                .filter(User::isActive)
                .map(this::toResponse)
                .toList();
    }

    private User findUser(String id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));
    }

    private void ensureAnotherActiveAdminExists(String message) {
        if (userRepository.countByRoleAndActiveTrue(Role.ADMIN) <= 1) {
            throw new IllegalArgumentException(message);
        }
    }

    private UserResponse toResponse(User user) {
        return new UserResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getRole(),
                user.getRole() == Role.ADMIN ? null : user.getDepartmentId(),
                user.isActive(),
                user.getCreatedAt());
    }
}
