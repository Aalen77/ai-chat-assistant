package com.gukalu.ai.controller;

import com.gukalu.ai.dto.request.LoginRequest;
import com.gukalu.ai.dto.request.RegisterRequest;
import com.gukalu.ai.dto.response.ApiResponse;
import com.gukalu.ai.dto.response.AuthResponse;
import com.gukalu.ai.service.AuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        ApiResponse<AuthResponse> result = authService.register(request);
        if (result.getCode() != 200) {
            return ResponseEntity.status(result.getCode()).body(java.util.Map.of("error", result.getMessage()));
        }
        return ResponseEntity.ok(result.getData());
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        ApiResponse<AuthResponse> result = authService.login(request);
        if (result.getCode() != 200) {
            return ResponseEntity.status(result.getCode()).body(java.util.Map.of("error", result.getMessage()));
        }
        return ResponseEntity.ok(result.getData());
    }
}
