package com.trackit.service;

import com.trackit.dto.UserResponse;
import com.trackit.exception.ResourceNotFoundException;
import com.trackit.model.Role;
import com.trackit.model.User;
import com.trackit.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

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
                user.getExpertise() == null ? List.of() : List.copyOf(user.getExpertise()),
                user.isActive(),
                user.getCreatedAt());
    }
}
