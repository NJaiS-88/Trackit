package com.trackit.service;

import com.trackit.model.Counter;
import lombok.RequiredArgsConstructor;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

import java.util.Objects;

/** Hands out employee ids ({@code EMP-000001}, {@code EMP-000002}, …) from one atomic counter shared by all roles. */
@Service
@RequiredArgsConstructor
public class EmployeeIdService {

    private static final String COUNTER_ID = "employee";

    private final MongoTemplate mongoTemplate;

    /** The next id; never returned twice, even if the account is later deactivated. */
    public String nextEmployeeId() {
        Counter counter = mongoTemplate.findAndModify(
                Query.query(Criteria.where("_id").is(COUNTER_ID)),
                new Update().inc("seq", 1),
                FindAndModifyOptions.options().returnNew(true).upsert(true),
                Counter.class);
        long seq = Objects.requireNonNull(counter, "Employee counter upsert returned null").getSeq();
        return "EMP-%06d".formatted(seq);
    }
}
