package com.trackit.service;

import com.trackit.dto.CreateDepartmentRequest;
import com.trackit.dto.DepartmentResponse;
import com.trackit.exception.DepartmentAlreadyExistsException;
import com.trackit.model.Department;
import com.trackit.repository.DepartmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class DepartmentService {

    private final DepartmentRepository departmentRepository;

    public Page<DepartmentResponse> getDepartments(Pageable pageable) {
        return departmentRepository.findAll(pageable).map(DepartmentResponse::from);
    }

    public DepartmentResponse createDepartment(CreateDepartmentRequest request, String adminId) {
        String name = request.name().trim().replaceAll("\\s+", " ");
        String nameKey = name.toLowerCase(Locale.ROOT);
        if (departmentRepository.existsByNameKey(nameKey)) {
            throw new DepartmentAlreadyExistsException(name);
        }

        Department department = Department.builder()
                .name(name)
                .nameKey(nameKey)
                .description(StringUtils.hasText(request.description()) ? request.description().trim() : null)
                .createdAt(Instant.now())
                .createdBy(adminId)
                .build();

        try {
            return DepartmentResponse.from(departmentRepository.save(department));
        } catch (DuplicateKeyException e) {
            throw new DepartmentAlreadyExistsException(name);
        }
    }
}
