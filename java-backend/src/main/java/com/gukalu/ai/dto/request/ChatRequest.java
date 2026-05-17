package com.gukalu.ai.dto.request;

import java.util.List;
import java.util.Map;

public class ChatRequest {
    private List<Map<String, Object>> messages;
    private Long sessionId;

    public List<Map<String, Object>> getMessages() { return messages; }
    public void setMessages(List<Map<String, Object>> messages) { this.messages = messages; }
    public Long getSessionId() { return sessionId; }
    public void setSessionId(Long sessionId) { this.sessionId = sessionId; }
}
