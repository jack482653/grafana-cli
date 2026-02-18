import axios, { type AxiosError, type AxiosInstance } from "axios";

import type { ServerConfig, ServerStatus } from "../types/index.js";

/**
 * Create axios HTTP client for Grafana API
 */
export function createClient(config: ServerConfig): AxiosInstance {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Add authentication headers
  if (config.apiKey) {
    headers["Authorization"] = `Bearer ${config.apiKey}`;
  } else if (config.username && config.password) {
    const credentials = Buffer.from(`${config.username}:${config.password}`).toString("base64");
    headers["Authorization"] = `Basic ${credentials}`;
  }

  return axios.create({
    baseURL: config.url,
    timeout: config.timeout || 30000,
    headers,
  });
}

/**
 * Handle HTTP errors with meaningful messages
 */
export function handleError(error: unknown, serverUrl: string): never {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;

    // Authentication errors
    if (axiosError.response?.status === 401) {
      console.error("Error: Authentication failed.");
      console.error(`Server: ${serverUrl}`);
      console.error("Check your API key or credentials with: grafana-cli config list");
      process.exit(2); // Exit code 2 = auth error
    }

    if (axiosError.response?.status === 403) {
      console.error("Error: Permission denied.");
      console.error(`Server: ${serverUrl}`);
      console.error("Your credentials do not have sufficient permissions.");
      process.exit(2); // Exit code 2 = auth error
    }

    // Network errors
    if (axiosError.code === "ECONNREFUSED") {
      console.error("Error: Cannot connect to Grafana server.");
      console.error(`URL: ${serverUrl}`);
      console.error("Check if Grafana is running and the URL is correct.");
      process.exit(3); // Exit code 3 = network error
    }

    if (axiosError.code === "ETIMEDOUT") {
      console.error("Error: Connection timeout.");
      console.error(`Server: ${serverUrl}`);
      console.error("Grafana server did not respond in time.");
      process.exit(3); // Exit code 3 = network error
    }

    // Other HTTP errors
    if (axiosError.response) {
      console.error(`Error: HTTP ${axiosError.response.status}`);
      console.error(`Server: ${serverUrl}`);
      if (axiosError.response.data) {
        console.error(`Message: ${JSON.stringify(axiosError.response.data)}`);
      }
      process.exit(1); // Exit code 1 = general error
    }
  }

  // Unknown errors
  console.error("Error:", error instanceof Error ? error.message : String(error));
  process.exit(1);
}

/**
 * Get server status from Grafana health API
 */
export async function getServerStatus(config: ServerConfig): Promise<ServerStatus> {
  const client = createClient(config);

  try {
    const response = await client.get<ServerStatus>("/api/health");
    return response.data;
  } catch (error) {
    handleError(error, config.url);
  }
}
