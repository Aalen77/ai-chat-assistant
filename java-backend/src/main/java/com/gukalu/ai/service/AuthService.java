package com.gukalu.ai.service;

import com.gukalu.ai.dto.request.LoginRequest;
import com.gukalu.ai.dto.request.RegisterRequest;
import com.gukalu.ai.dto.response.ApiResponse;
import com.gukalu.ai.dto.response.AuthResponse;
import com.gukalu.ai.entity.UserEntity;
import com.gukalu.ai.jwt.JwtUtil;
import com.gukalu.ai.repository.UserRepository;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    public AuthService(UserRepository userRepository, JwtUtil jwtUtil) {
        this.userRepository = userRepository;
        this.jwtUtil = jwtUtil;
    }

    public ApiResponse<AuthResponse> register(RegisterRequest req) {
        String username = req.getUsername();
        String password = req.getPassword();

        if (username == null || password == null || username.isBlank() || password.isBlank()) {
            return ApiResponse.error(400, "用户名和密码不能为空");
        }
        if (username.length() < 2 || username.length() > 20) {
            return ApiResponse.error(400, "用户名长度需在2-20个字符之间");
        }
        if (password.length() < 6) {
            return ApiResponse.error(400, "密码长度不能少于6位");
        }

        if (userRepository.existsByUsername(username)) {
            return ApiResponse.error(409, "用户名已被使用");
        }

        UserEntity user = new UserEntity();
        user.setUsername(username);
        user.setPasswordHash(encoder.encode(password));
        user = userRepository.save(user);

        String token = jwtUtil.generateToken(user.getId());
        AuthResponse data = new AuthResponse(token, Map.of("id", user.getId(), "username", user.getUsername()));
        return ApiResponse.success(data);
    }

    public ApiResponse<AuthResponse> login(LoginRequest req) {
        String username = req.getUsername();
        String password = req.getPassword();

        if (username == null || password == null || username.isBlank() || password.isBlank()) {
            return ApiResponse.error(400, "用户名和密码不能为空");
        }

        UserEntity user = userRepository.findByUsername(username).orElse(null);
        if (user == null || !encoder.matches(password, user.getPasswordHash())) {
            return ApiResponse.error(401, "用户名或密码错误");
        }

        String token = jwtUtil.generateToken(user.getId());
        AuthResponse data = new AuthResponse(token, Map.of("id", user.getId(), "username", user.getUsername()));
        return ApiResponse.success(data);
    }
}
