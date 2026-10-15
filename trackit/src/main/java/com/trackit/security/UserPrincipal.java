package com.trackit.security;

import com.trackit.model.Role;
import com.trackit.model.User;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

/**
 * Spring Security view of a {@link User}. Authorities follow the {@code ROLE_<ROLE>} convention,
 * so {@code hasRole("ADMIN")} works out of the box.
 */
@Getter
public class UserPrincipal implements UserDetails {

    private final String id;
    private final String name;
    private final String email;
    private final String password;
    private final Role role;
    private final boolean active;
    private final List<GrantedAuthority> authorities;

    private UserPrincipal(User user) {
        this.id = user.getId();
        this.name = user.getName();
        this.email = user.getEmail();
        this.password = user.getPassword();
        this.role = user.getRole();
        this.active = user.isActive();
        this.authorities = List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()));
    }

    public static UserPrincipal from(User user) {
        return new UserPrincipal(user);
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isEnabled() {
        return active;
    }
}
