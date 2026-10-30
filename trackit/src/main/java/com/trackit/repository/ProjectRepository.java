package com.trackit.repository;

import com.trackit.model.Project;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface ProjectRepository extends MongoRepository<Project, String> {

    List<Project> findByDepartmentIdOrderByNameAsc(String departmentId);

    boolean existsByDepartmentIdAndNameKey(String departmentId, String nameKey);
}
