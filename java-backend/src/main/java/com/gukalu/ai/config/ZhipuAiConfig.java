package com.gukalu.ai.config;

import dev.langchain4j.model.chat.StreamingChatLanguageModel;
import dev.langchain4j.model.openai.OpenAiStreamingChatModel;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

@Configuration
public class ZhipuAiConfig {

    @Bean
    public StreamingChatLanguageModel textModel(
            @Value("${zhipu.api-key}") String apiKey,
            @Value("${zhipu.base-url}") String baseUrl) {
        return OpenAiStreamingChatModel.builder()
                .apiKey(apiKey)
                .baseUrl(baseUrl)
                .modelName("glm-4.5-air")
                .timeout(Duration.ofSeconds(60))
                .build();
    }

    @Bean
    public StreamingChatLanguageModel visionModel(
            @Value("${zhipu.api-key}") String apiKey,
            @Value("${zhipu.base-url}") String baseUrl) {
        return OpenAiStreamingChatModel.builder()
                .apiKey(apiKey)
                .baseUrl(baseUrl)
                .modelName("glm-4v-flash")
                .timeout(Duration.ofSeconds(60))
                .build();
    }
}
