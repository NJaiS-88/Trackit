package com.trackit.service;

import com.trackit.model.Incident;
import com.trackit.model.User;
import com.trackit.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** Which department handles a ticket, including tickets raised before handling departments were recorded. */
@Component
@RequiredArgsConstructor
public class TicketDepartments {

    private final UserRepository userRepository;

    /** The department set on the ticket, or for older tickets the reporter's department; null if neither exists. */
    public String handlingDepartmentId(Incident incident) {
        if (incident.getHandlingDepartmentId() != null) {
            return incident.getHandlingDepartmentId();
        }
        if (incident.getCreatedBy() == null) {
            return null;
        }
        return userRepository.findById(incident.getCreatedBy()).map(User::getDepartmentId).orElse(null);
    }
}
