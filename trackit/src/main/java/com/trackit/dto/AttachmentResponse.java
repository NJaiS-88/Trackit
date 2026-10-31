package com.trackit.dto;

/**
 * A file attached to work. {@code path} keeps the folder structure of a folder upload
 * (e.g. {@code specs/login.pdf}); for a single file it equals {@code name}.
 */
public record AttachmentResponse(
        String id,
        String name,
        String path,
        long size,
        String contentType
) {
}
