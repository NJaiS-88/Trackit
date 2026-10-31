package com.trackit.repository;

import com.trackit.model.AccountRequest;
import com.trackit.model.enums.AccountRequestStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface AccountRequestRepository extends MongoRepository<AccountRequest, String> {

    boolean existsByEmailAndStatus(String email, AccountRequestStatus status);

    Optional<AccountRequest> findFirstByEmailOrderByCreatedAtDesc(String email);

    Page<AccountRequest> findByStatus(AccountRequestStatus status, Pageable pageable);

    long countByStatus(AccountRequestStatus status);
}
