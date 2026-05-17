package com.gukalu.ai.config;

import dev.langchain4j.mcp.McpToolProvider;
import dev.langchain4j.mcp.client.DefaultMcpClient;
import dev.langchain4j.mcp.client.McpClient;
import dev.langchain4j.mcp.client.transport.McpTransport;
import dev.langchain4j.mcp.client.transport.http.HttpMcpTransport;
import dev.langchain4j.mcp.client.transport.stdio.StdioMcpTransport;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Configuration
public class McpConfig {

    @Bean
    @ConfigurationProperties(prefix = "mcp")
    public McpSettings mcpSettings() {
        return new McpSettings();
    }

    @Bean
    public McpToolProvider mcpToolProvider(McpSettings settings) {
        if (settings.getServers() == null || settings.getServers().isEmpty()) {
            return null;
        }
        System.out.println("[MCP] Connecting to " + settings.getServers().size() + " MCP server(s)...");
        List<McpClient> clients = new ArrayList<>();
        for (McpServerConfig server : settings.getServers()) {
            System.out.println("[MCP] Connecting to server '" + server.getName() + "' (" + server.getType() + ")...");
            McpTransport transport = buildTransport(server);
            McpClient client = new DefaultMcpClient.Builder()
                    .transport(transport)
                    .clientName(server.getName())
                    .toolExecutionTimeout(Duration.ofSeconds(120))
                    .build();
            clients.add(client);
        }
        return new McpToolProvider.Builder()
                .mcpClients(clients)
                .build();
    }

    private McpTransport buildTransport(McpServerConfig server) {
        String type = server.getType() != null ? server.getType() : "sse";

        if ("stdio".equals(type)) {
            if (server.getCommand() == null || server.getCommand().isEmpty()) {
                throw new IllegalArgumentException("stdio MCP server '" + server.getName()
                        + "' missing 'command'");
            }
            var builder = new StdioMcpTransport.Builder()
                    .command(server.getCommand())
                    .logEvents(true);
            if (server.getEnv() != null && !server.getEnv().isEmpty()) {
                builder.environment(server.getEnv());
            }
            return builder.build();
        }

        // default: SSE
        if (server.getUrl() == null || server.getUrl().isBlank()) {
            throw new IllegalArgumentException("SSE MCP server '" + server.getName()
                    + "' missing 'url'");
        }
        return new HttpMcpTransport.Builder()
                .sseUrl(server.getUrl())
                .timeout(Duration.ofSeconds(30))
                .build();
    }

    public static class McpSettings {
        private List<McpServerConfig> servers = new ArrayList<>();

        public List<McpServerConfig> getServers() { return servers; }
        public void setServers(List<McpServerConfig> servers) { this.servers = servers; }
    }

    public static class McpServerConfig {
        private String name = "mcp-server";
        private String type = "sse";
        private String url;
        private List<String> command;
        private Map<String, String> env = new HashMap<>();

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getType() { return type; }
        public void setType(String type) { this.type = type; }
        public String getUrl() { return url; }
        public void setUrl(String url) { this.url = url; }
        public List<String> getCommand() { return command; }
        public void setCommand(List<String> command) { this.command = command; }
        public Map<String, String> getEnv() { return env; }
        public void setEnv(Map<String, String> env) { this.env = env; }
    }
}
