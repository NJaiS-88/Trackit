package com.trackit.service;

import com.trackit.dto.AccountRequestResponse;
import com.trackit.exception.EmailAlreadyExistsException;
import com.trackit.exception.ResourceNotFoundException;
import com.trackit.exception.WorkflowViolationException;
import com.trackit.model.AccountRequest;
import com.trackit.model.Role;
import com.trackit.model.User;
import com.trackit.model.enums.AccountRequestStatus;
import com.trackit.repository.AccountRequestRepository;
import com.trackit.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class AccountRequestService {

    private final AccountRequestRepository accountRequestRepository;
    private final UserRepository userRepository;
    private final EmployeeIdService employeeIdService;

    /** {@code status} null lists every request. */
    public Page<AccountRequestResponse> getRequests(AccountRequestStatus status, Pageable pageable) {
        Page<AccountRequest> page = status == null
                ? accountRequestRepository.findAll(pageable)
                : accountRequestRepository.findByStatus(status, pageable);
        return page.map(AccountRequestResponse::from);
    }

    /** Creates an active EMPLOYEE from the request; admins can change the role afterwards. */
    public AccountRequestResponse approve(String requestId, String adminId) {
        AccountRequest request = findPending(requestId);
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new EmailAlreadyExistsException(request.getEmail());
        }

        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .password(request.getPassword())
                .role(Role.EMPLOYEE)
                .expertise(new ArrayList<>())
                .active(true)
                .createdAt(Instant.now())
                .build();

        // Saved first so @Version rejects a concurrent approve/reject before any user is created
        markReviewed(request, AccountRequestStatus.APPROVED, adminId);
        request.setPassword(null);
        request = accountRequestRepository.save(request);

        // Taken only once the approval is saved, so rejected or raced requests never use up a number
        user.setEmployeeId(employeeIdService.nextEmployeeId());
        try {
            userRepository.save(user);
        } catch (DuplicateKeyException e) {
            throw new EmailAlreadyExistsException(user.getEmail());
        }
        return AccountRequestResponse.from(request);
    }

    public AccountRequestResponse reject(String requestId, String adminId) {
        AccountRequest request = findPending(requestId);
        markReviewed(request, AccountRequestStatus.REJECTED, adminId);
        return AccountRequestResponse.from(accountRequestRepository.save(request));
    }

    private AccountRequest findPending(String requestId) {
        AccountRequest request = accountRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Account request", "id", requestId));
        if (request.getStatus() != AccountRequestStatus.PENDING) {
            throw new WorkflowViolationException(
                    "This request has already been " + request.getStatus().name().toLowerCase(Locale.ROOT));
        }
        return request;
    }

    private static void markReviewed(AccountRequest request, AccountRequestStatus status, String adminId) {
        request.setStatus(status);
        request.setReviewedAt(Instant.now());
        request.setReviewedBy(adminId);
    }
}
