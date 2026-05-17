package com.gukalu.ai.service;

import dev.langchain4j.agent.tool.ToolExecutionRequest;
import dev.langchain4j.agent.tool.ToolSpecification;
import dev.langchain4j.data.message.*;
import dev.langchain4j.mcp.McpToolProvider;
import dev.langchain4j.model.chat.StreamingChatLanguageModel;
import dev.langchain4j.model.chat.request.ChatRequest;
import dev.langchain4j.model.chat.response.ChatResponse;
import dev.langchain4j.model.chat.response.StreamingChatResponseHandler;
import dev.langchain4j.service.tool.ToolExecutionResult;
import dev.langchain4j.service.tool.ToolExecutor;
import dev.langchain4j.service.tool.ToolProviderRequest;
import dev.langchain4j.service.tool.ToolProviderResult;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;

@Service
public class ChatService {

    private final StreamingChatLanguageModel textModel;
    private final StreamingChatLanguageModel visionModel;
    private final McpToolProvider mcpToolProvider;

    public ChatService(
            @Qualifier("textModel") StreamingChatLanguageModel textModel,
            @Qualifier("visionModel") StreamingChatLanguageModel visionModel,
            @Autowired(required = false) McpToolProvider mcpToolProvider) {
        // mcpToolProvider will be null if no MCP servers are configured
        this.textModel = textModel;
        this.visionModel = visionModel;
        this.mcpToolProvider = mcpToolProvider;
    }

    public Flux<String> streamChat(List<Map<String, Object>> messages) {
        List<ChatMessage> langChainMessages = toLangChainMessages(messages);

        if (mcpToolProvider == null) {
            return simpleStream(langChainMessages);
        }

        ToolProviderResult toolResult = mcpToolProvider.provideTools(new ToolProviderRequest(null, null));
        Map<ToolSpecification, ToolExecutor> tools = toolResult.tools();
        List<ToolSpecification> specifications = new ArrayList<>(tools.keySet());
        Map<String, ToolExecutor> executors = new HashMap<>();
        for (Map.Entry<ToolSpecification, ToolExecutor> entry : tools.entrySet()) {
            executors.put(entry.getKey().name(), entry.getValue());
        }

        return streamWithTools(langChainMessages, specifications, executors);
    }

    private Flux<String> simpleStream(List<ChatMessage> messages) {
        StreamingChatLanguageModel model = hasImage(messages) ? visionModel : textModel;
        return Flux.create(emitter -> {
            model.chat(ChatRequest.builder()
                            .messages(messages)
                            .build(),
                    new StreamingChatResponseHandler() {
                        @Override
                        public void onPartialResponse(String token) {
                            if (token != null && !token.isEmpty()) {
                                emitter.next(token);
                            }
                        }

                        @Override
                        public void onCompleteResponse(ChatResponse response) {
                            emitter.complete();
                        }

                        @Override
                        public void onError(Throwable error) {
                            emitter.error(error);
                        }
                    });
        });
    }

    private Flux<String> streamWithTools(
            List<ChatMessage> messages,
            List<ToolSpecification> specifications,
            Map<String, ToolExecutor> executors) {

        AtomicBoolean toolWasCalled = new AtomicBoolean(false);

        Flux<String> streaming = Flux.create(emitter -> {
            StreamingChatLanguageModel model = hasImage(messages) ? visionModel : textModel;
            model.chat(ChatRequest.builder()
                            .messages(messages)
                            .toolSpecifications(specifications)
                            .build(),
                    new StreamingChatResponseHandler() {
                        @Override
                        public void onPartialResponse(String token) {
                            if (token != null && !token.isEmpty()) {
                                emitter.next(token);
                            }
                        }

                        @Override
                        public void onCompleteResponse(ChatResponse response) {
                            AiMessage aiMessage = response.aiMessage();
                            if (aiMessage.hasToolExecutionRequests()) {
                                toolWasCalled.set(true);
                                messages.add(aiMessage);
                                for (ToolExecutionRequest req : aiMessage.toolExecutionRequests()) {
                                    ToolExecutor executor = executors.get(req.name());
                                    if (executor != null) {
                                        String result = executor.execute(req, null);
                                        messages.add(ToolExecutionResultMessage.from(req, result));
                                    }
                                }
                            } else {
                                messages.add(aiMessage);
                            }
                            emitter.complete();
                        }

                        @Override
                        public void onError(Throwable error) {
                            emitter.error(error);
                        }
                    });
        });

        return streaming.concatWith(Flux.defer(() -> {
            if (toolWasCalled.get()) {
                return streamWithTools(messages, specifications, executors);
            }
            return Flux.empty();
        }));
    }

    private boolean hasImage(List<ChatMessage> messages) {
        for (ChatMessage msg : messages) {
            if (msg.type() == ChatMessageType.USER && msg instanceof UserMessage userMsg) {
                for (Content content : userMsg.contents()) {
                    if (content.type() == ContentType.IMAGE) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    private List<ChatMessage> toLangChainMessages(List<Map<String, Object>> messages) {
        List<ChatMessage> result = new ArrayList<>();
        for (Map<String, Object> msg : messages) {
            String role = (String) msg.get("role");
            Object content = msg.get("content");

            switch (role) {
                case "system" -> result.add(new SystemMessage((String) content));
                case "assistant" -> result.add(new AiMessage((String) content));

                case "user" -> {
                    if (content instanceof List<?> contentList) {
                        List<Content> parts = new ArrayList<>();
                        for (Object item : contentList) {
                            if (item instanceof Map<?, ?> part) {
                                String type = (String) part.get("type");
                                if ("image_url".equals(type)) {
                                    Map<?, ?> imageUrl = (Map<?, ?>) part.get("image_url");
                                    String url = (String) imageUrl.get("url");
                                    parts.add(ImageContent.from(url));
                                } else if ("text".equals(type)) {
                                    parts.add(new TextContent((String) part.get("text")));
                                }
                            }
                        }
                        result.add(new UserMessage(parts));
                    } else {
                        result.add(new UserMessage((String) content));
                    }
                }
            }
        }
        return result;
    }
}
