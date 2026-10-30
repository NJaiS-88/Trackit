package com.trackit.repository;

import com.trackit.model.WorkItem;
import com.trackit.model.enums.WorkItemStatus;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface WorkItemRepository extends MongoRepository<WorkItem, String> {

    List<WorkItem> findByDepartmentIdOrderByCreatedAtDesc(String departmentId);

    List<WorkItem> findByAssignedToOrderByCreatedAtDesc(String userId);

    List<WorkItem> findAllByOrderByCreatedAtDesc();

    List<WorkItem> findByIncidentIdInAndStatusIn(Collection<String> incidentIds, Collection<WorkItemStatus> statuses);

    boolean existsByIncidentIdAndStatusIn(String incidentId, Collection<WorkItemStatus> statuses);

    Optional<WorkItem> findFirstByIncidentIdOrderByCreatedAtDesc(String incidentId);

    List<WorkItem> findByProjectIdIn(Collection<String> projectIds);
}
