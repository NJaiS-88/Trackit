package com.trackit.service;

import com.mongodb.client.gridfs.model.GridFSFile;
import com.trackit.dto.AttachmentResponse;
import com.trackit.exception.ResourceNotFoundException;
import com.trackit.exception.UnauthorizedException;
import com.trackit.exception.WorkflowViolationException;
import com.trackit.model.Role;
import com.trackit.model.User;
import com.trackit.repository.UserRepository;
import com.trackit.repository.WorkItemRepository;
import lombok.RequiredArgsConstructor;
import org.bson.Document;
import org.bson.types.ObjectId;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.gridfs.GridFsResource;
import org.springframework.data.mongodb.gridfs.GridFsTemplate;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * Files Leads attach to project work, kept in MongoDB GridFS. A file can be read by the Lead who uploaded it,
 * Leads of the same department, admins, and employees assigned work that references it.
 */
@Service
@RequiredArgsConstructor
public class AttachmentService {

    public static final int MAX_FILES = 20;
    private static final int MAX_PATH_LENGTH = 255;
    private static final String DEFAULT_CONTENT_TYPE = "application/octet-stream";

    private final GridFsTemplate gridFsTemplate;
    private final UserRepository userRepository;
    private final WorkItemRepository workItemRepository;

    /** A stored file opened for download. */
    public record Download(String name, long size, InputStream content) {
    }

    /**
     * Stores the files for the Lead's department. {@code paths} optionally gives each file's path inside an
     * uploaded folder, in the same order as {@code files}.
     */
    public List<AttachmentResponse> upload(String leadId, List<MultipartFile> files, List<String> paths) {
        User lead = userRepository.findById(leadId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", leadId));
        if (lead.getDepartmentId() == null) {
            throw new WorkflowViolationException("You have not been assigned to a department yet");
        }
        List<MultipartFile> nonEmpty = files == null ? List.of() : files.stream().filter(Objects::nonNull).toList();
        if (nonEmpty.isEmpty()) {
            throw new WorkflowViolationException("Choose at least one file");
        }
        if (nonEmpty.size() > MAX_FILES) {
            throw new WorkflowViolationException("At most %d files can be attached at once".formatted(MAX_FILES));
        }

        List<AttachmentResponse> stored = new ArrayList<>();
        for (int i = 0; i < nonEmpty.size(); i++) {
            MultipartFile file = nonEmpty.get(i);
            if (file.isEmpty()) {
                throw new WorkflowViolationException("\"%s\" is empty".formatted(file.getOriginalFilename()));
            }
            String requestedPath = paths != null && i < paths.size() && StringUtils.hasText(paths.get(i))
                    ? paths.get(i)
                    : file.getOriginalFilename();
            String path = cleanPath(requestedPath);
            String name = path.substring(path.lastIndexOf('/') + 1);
            String contentType = StringUtils.hasText(file.getContentType()) ? file.getContentType() : DEFAULT_CONTENT_TYPE;

            Document metadata = new Document("uploadedBy", leadId)
                    .append("departmentId", lead.getDepartmentId())
                    .append("path", path);
            try (InputStream content = file.getInputStream()) {
                ObjectId id = gridFsTemplate.store(content, name, contentType, metadata);
                stored.add(new AttachmentResponse(id.toHexString(), name, path, file.getSize(), contentType));
            } catch (IOException e) {
                throw new UncheckedIOException("Could not store " + name, e);
            }
        }
        return stored;
    }

    /** Ensures every id is a file this Lead uploaded, so a task can't reference someone else's files. */
    public void requireUploadedBy(String leadId, Collection<String> attachmentIds) {
        if (attachmentIds.isEmpty()) {
            return;
        }
        Map<String, GridFSFile> files = findFiles(attachmentIds);
        for (String id : attachmentIds) {
            GridFSFile file = files.get(id);
            if (file == null || file.getMetadata() == null || !leadId.equals(file.getMetadata().getString("uploadedBy"))) {
                throw new ResourceNotFoundException("Attachment", "id", id);
            }
        }
    }

    /** Descriptions of the given files; ids of files that no longer exist are left out. */
    public Map<String, AttachmentResponse> describe(Collection<String> attachmentIds) {
        Map<String, AttachmentResponse> result = new HashMap<>();
        findFiles(attachmentIds).forEach((id, file) -> result.put(id, toResponse(file)));
        return result;
    }

    public Download open(String attachmentId, String userId, Role role) {
        GridFSFile file = findFiles(List.of(attachmentId)).get(attachmentId);
        if (file == null) {
            throw new ResourceNotFoundException("Attachment", "id", attachmentId);
        }
        if (!canRead(file, attachmentId, userId, role)) {
            throw new UnauthorizedException("You don't have access to this file");
        }
        GridFsResource resource = gridFsTemplate.getResource(file);
        try {
            return new Download(file.getFilename(), file.getLength(), resource.getInputStream());
        } catch (IOException e) {
            throw new UncheckedIOException("Could not read " + file.getFilename(), e);
        }
    }

    private boolean canRead(GridFSFile file, String attachmentId, String userId, Role role) {
        if (role == Role.ADMIN) {
            return true;
        }
        Document metadata = file.getMetadata() == null ? new Document() : file.getMetadata();
        if (userId.equals(metadata.getString("uploadedBy"))) {
            return true;
        }
        if (role == Role.ENGINEER) {
            String departmentId = userRepository.findById(userId).map(User::getDepartmentId).orElse(null);
            return departmentId != null && departmentId.equals(metadata.getString("departmentId"));
        }
        return workItemRepository.existsByAttachmentIdsContainingAndAssignedTo(attachmentId, userId);
    }

    private Map<String, GridFSFile> findFiles(Collection<String> attachmentIds) {
        List<ObjectId> ids = attachmentIds.stream()
                .filter(Objects::nonNull)
                .filter(ObjectId::isValid)
                .map(ObjectId::new)
                .distinct()
                .toList();
        Map<String, GridFSFile> files = new HashMap<>();
        if (ids.isEmpty()) {
            return files;
        }
        gridFsTemplate.find(Query.query(Criteria.where("_id").in(ids)))
                .forEach(file -> files.put(file.getObjectId().toHexString(), file));
        return files;
    }

    private static AttachmentResponse toResponse(GridFSFile file) {
        Document metadata = file.getMetadata() == null ? new Document() : file.getMetadata();
        String path = Objects.requireNonNullElse(metadata.getString("path"), file.getFilename());
        String contentType = Objects.requireNonNullElse(metadata.getString("_contentType"), DEFAULT_CONTENT_TYPE);
        return new AttachmentResponse(
                file.getObjectId().toHexString(), file.getFilename(), path, file.getLength(), contentType);
    }

    /** Folder-relative path with "..", "." and empty segments removed, e.g. {@code docs/spec.pdf}. */
    private static String cleanPath(String raw) {
        String joined = Arrays.stream(Objects.requireNonNullElse(raw, "").replace('\\', '/').split("/"))
                .map(String::trim)
                .filter(segment -> !segment.isEmpty() && !segment.equals(".") && !segment.equals(".."))
                .collect(Collectors.joining("/"));
        if (joined.isEmpty()) {
            return "file";
        }
        return joined.length() > MAX_PATH_LENGTH ? joined.substring(joined.length() - MAX_PATH_LENGTH) : joined;
    }
}
