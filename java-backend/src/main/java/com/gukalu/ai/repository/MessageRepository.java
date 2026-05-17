package com.gukalu.ai.repository;

import com.gukalu.ai.entity.MessageEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MessageRepository extends JpaRepository<MessageEntity, Long> {
    List<MessageEntity> findBySessionIdOrderByTimestampAsc(Long sessionId);
    void deleteBySessionId(Long sessionId);
    long countBySessionId(Long sessionId);
}
