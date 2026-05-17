package com.gukalu.ai.repository;

import com.gukalu.ai.entity.SessionEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SessionRepository extends JpaRepository<SessionEntity, Long> {
    List<SessionEntity> findByUserIdOrderByCreatedAtDesc(Long userId);
    long countByUserId(Long userId);
}
