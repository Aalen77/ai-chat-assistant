package com.gukalu.ai.service;

import com.gukalu.ai.entity.MessageEntity;
import com.gukalu.ai.entity.SessionEntity;
import com.gukalu.ai.repository.MessageRepository;
import com.gukalu.ai.repository.SessionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
public class SessionService {

    private final SessionRepository sessionRepository;
    private final MessageRepository messageRepository;

    public SessionService(SessionRepository sessionRepository, MessageRepository messageRepository) {
        this.sessionRepository = sessionRepository;
        this.messageRepository = messageRepository;
    }

    public List<Map<String, Object>> listSessions(Long userId) {
        return sessionRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(s -> Map.<String, Object>of(
                        "id", s.getId(),
                        "title", s.getTitle(),
                        "role", s.getRole(),
                        "created_at", s.getCreatedAt().toString()
                ))
                .toList();
    }

    public Map<String, Object> createSession(Long userId, String role, String title) {
        SessionEntity session = new SessionEntity();
        session.setUserId(userId);
        session.setRole(role != null ? role : "assistant");
        session.setTitle(title != null ? title : "新对话");
        session = sessionRepository.save(session);
        return Map.of("id", session.getId());
    }

    @Transactional
    public void deleteSession(Long sessionId, Long userId) {
        SessionEntity session = sessionRepository.findById(sessionId).orElse(null);
        if (session != null && session.getUserId().equals(userId)) {
            messageRepository.deleteBySessionId(sessionId);
            sessionRepository.delete(session);
        }
    }

    public void renameSession(Long sessionId, String title, Long userId) {
        SessionEntity session = sessionRepository.findById(sessionId).orElse(null);
        if (session != null && session.getUserId().equals(userId)) {
            session.setTitle(title);
            sessionRepository.save(session);
        }
    }

    public List<Map<String, Object>> getMessages(Long sessionId, Long userId) {
        SessionEntity session = sessionRepository.findById(sessionId).orElse(null);
        if (session == null || !session.getUserId().equals(userId)) {
            return List.of();
        }
        return messageRepository.findBySessionIdOrderByTimestampAsc(sessionId)
                .stream()
                .map(m -> Map.<String, Object>of(
                        "id", m.getMessageId(),
                        "role", m.getRole(),
                        "content", m.getContent(),
                        "image_url", m.getImageUrl() != null ? m.getImageUrl() : null,
                        "timestamp", m.getTimestamp()
                ))
                .toList();
    }

    public void saveMessage(Long sessionId, Long userId, Map<String, Object> msg) {
        SessionEntity session = sessionRepository.findById(sessionId).orElse(null);
        if (session == null || !session.getUserId().equals(userId)) return;

        MessageEntity entity = new MessageEntity();
        entity.setSessionId(sessionId);
        entity.setMessageId((String) msg.get("id"));
        entity.setRole((String) msg.get("role"));
        entity.setContent((String) msg.get("content"));
        entity.setImageUrl((String) msg.get("image_url"));
        Object ts = msg.get("timestamp");
        entity.setTimestamp(ts instanceof Number ? ((Number) ts).longValue() : System.currentTimeMillis());
        messageRepository.save(entity);
    }

    @Transactional
    public void clearMessages(Long sessionId, Long userId) {
        SessionEntity session = sessionRepository.findById(sessionId).orElse(null);
        if (session != null && session.getUserId().equals(userId)) {
            messageRepository.deleteBySessionId(sessionId);
        }
    }
}
