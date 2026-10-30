package com.trackit.dto;

/**
 * @param headerName header to send the token in on POST/PUT/PATCH/DELETE
 * @param token      masked token; a fresh mask is issued per response, any of them is accepted
 */
public record CsrfTokenResponse(String headerName, String token) {
}
