package com.trackit.controller;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.trackit.dto.AttachmentResponse;
import com.trackit.security.AuthenticatedUser;
import com.trackit.security.CurrentUser;
import com.trackit.service.AttachmentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.List;

@RestController
@RequiredArgsConstructor
@Tag(name = "Attachments", description = "Files Leads attach to project work")
public class AttachmentController {

    private static final TypeReference<List<String>> STRING_LIST = new TypeReference<>() {
    };

    private final AttachmentService attachmentService;
    private final ObjectMapper objectMapper;

    /**
     * {@code paths} is a JSON array of each file's path inside an uploaded folder, in file order. It travels as
     * one JSON value because a plain list parameter would be split on commas inside file names.
     */
    @PostMapping(path = "/api/team/attachments", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ENGINEER')")
    @Operation(summary = "Upload files (or a folder's files, with their paths) to attach to project work")
    public List<AttachmentResponse> upload(@RequestPart("files") List<MultipartFile> files,
                                           @RequestParam(value = "paths", required = false) String paths) {
        return attachmentService.upload(CurrentUser.get().id(), files, parsePaths(paths));
    }

    private List<String> parsePaths(String json) {
        if (json == null || json.isBlank()) {
            return null;
        }
        try {
            return objectMapper.readValue(json, STRING_LIST);
        } catch (JsonProcessingException e) {
            // Fall back to the files' own names
            return null;
        }
    }

    @GetMapping("/api/attachments/{id}")
    @Operation(summary = "Download an attachment you have access to")
    public ResponseEntity<InputStreamResource> download(@PathVariable String id) {
        AuthenticatedUser user = CurrentUser.get();
        AttachmentService.Download file = attachmentService.open(id, user.id(), user.role());
        // Always a download with a neutral type, so an uploaded HTML/SVG file can never run in the API's origin
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename(file.name(), StandardCharsets.UTF_8).build().toString())
                .header("X-Content-Type-Options", "nosniff")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .contentLength(file.size())
                .body(new InputStreamResource(file.content()));
    }
}
