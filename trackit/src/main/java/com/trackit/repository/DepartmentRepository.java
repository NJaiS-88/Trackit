package com.trackit.repository;

import com.trackit.model.Department;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface DepartmentRepository extends MongoRepository<Department, String> {

    boolean existsByNameKey(String nameKey);
}
