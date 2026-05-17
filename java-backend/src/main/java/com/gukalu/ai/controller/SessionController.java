package com.gukalu.ai.controller;

import com.gukalu.ai.service.SessionService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/sessions")
public class SessionController {

    private final SessionService sessionService;

    public SessionController(SessionService sessionService) {
        this.sessionService = sessionService;
    }

    @GetMapping
    public List<Map<String, Object>> listSessions(HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        return sessionService.listSessions(userId);
    }

    @PostMapping
    public Map<String, Object> createSession(HttpServletRequest request, @RequestBody(required = false) Map<String, String> body) {
        Long userId = (Long) request.getAttribute("userId");
        String role = body != null ? body.get("role") : null;
        String title = body != null ? body.get("title") : null;
        return sessionService.createSession(userId, role, title);
    }

    @DeleteMapping("/{id}")
    public Map<String, Object> deleteSession(@PathVariable Long id, HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        sessionService.deleteSession(id, userId);
        return Map.<String, Object>of("success", true);
    }

    @PutMapping("/{id}")
    public Map<String, Object> renameSession(@PathVariable Long id, @RequestBody Map<String, String> body, HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        sessionService.renameSession(id, body.get("title"), userId);
        return Map.<String, Object>of("success", true);
    }

    @GetMapping("/{id}/messages")
    public List<Map<String, Object>> getMessages(@PathVariable Long id, HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        return sessionService.getMessages(id, userId);
    }

    @PostMapping("/{id}/messages")
    public Map<String, Object> saveMessage(@PathVariable Long id, @RequestBody Map<String, Object> message, HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        sessionService.saveMessage(id, userId, message);
        return Map.<String, Object>of("success", true);
    }

    @DeleteMapping("/{id}/messages")
    public Map<String, Object> clearMessages(@PathVariable Long id, HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        sessionService.clearMessages(id, userId);
        return Map.<String, Object>of("success", true);
    }
}
