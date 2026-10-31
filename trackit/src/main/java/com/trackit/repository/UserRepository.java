package com.trackit.repository;

import com.trackit.model.Role;
import com.trackit.model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends MongoRepository<User, String> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    Page<User> findAll(Pageable pageable);

    /** Case-insensitive partial match on employee id, name or email; {@code pattern} must already be regex-escaped. */
    @Query("{ '$or': [ { 'employeeId': { '$regex': ?0, '$options': 'i' } },"
            + " { 'name': { '$regex': ?0, '$options': 'i' } },"
            + " { 'email': { '$regex': ?0, '$options': 'i' } } ] }")
    Page<User> search(String pattern, Pageable pageable);

    /** Matches users whose expertise list contains the given entry (exact, case-sensitive). */
    List<User> findByRoleAndExpertiseContaining(Role role, String expertise);

    List<User> findByRole(Role role);

    List<User> findByDepartmentIdAndRoleAndActiveTrueOrderByNameAsc(String departmentId, Role role);

    List<User> findByDepartmentId(String departmentId);

    List<User> findByDepartmentIdInAndRoleAndActiveTrueOrderByNameAsc(Collection<String> departmentIds, Role role);

    List<User> findByProjectIdInAndRoleAndActiveTrueOrderByNameAsc(Collection<String> projectIds, Role role);

    long countByRoleAndActiveTrue(Role role);
}
