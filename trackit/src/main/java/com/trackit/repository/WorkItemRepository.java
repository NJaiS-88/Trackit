package com.trackit.repository;

import com.trackit.model.WorkItem;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Collection;
import java.util.List;

public interface WorkItemRepository extends MongoRepository<WorkItem, String> {

    List<WorkItem> findByDepartmentIdOrderByCreatedAtDesc(String departmentId);

    List<WorkItem> findByAssignedToOrderByCreatedAtDesc(String userId);

    List<WorkItem> findAllByOrderByCreatedAtDesc();

    List<WorkItem> findByIncidentIdInOrderByCreatedAtAsc(Collection<String> incidentIds);

    List<WorkItem> findByIncidentIdOrderByCreatedAtAsc(String incidentId);

    List<WorkItem> findByProjectIdIn(Collection<String> projectIds);

    boolean existsByAttachmentIdsContainingAndAssignedTo(String attachmentId, String assignedTo);
}
