import { apiRequest } from "./api";

export type AiProvider = "openai" | "anthropic" | "gemini";

export interface AiKeyProviderStatus {
  provider: AiProvider;
  configured: boolean;
  preview: string | null;
  /** "workspace" = the workspace's own key; "platform" = no own key, the platform's shared key is allowed. */
  source: "workspace" | "platform" | null;
  updated_at: string | null;
}

export interface AiKeysOverview {
  platformAiEnabled: boolean;
  providers: AiKeyProviderStatus[];
}

export interface AiKeyTestResult {
  ok: boolean;
  message: string;
}

export const aiKeysService = {
  async list() {
    const response = await apiRequest<AiKeysOverview>("/api/v1/ai-keys");

    return response.data;
  },

  async save(provider: AiProvider, apiKey: string) {
    const response = await apiRequest<AiKeyProviderStatus | null>(`/api/v1/ai-keys/${provider}`, {
      method: "PUT",
      body: JSON.stringify({ apiKey }),
    });

    return response.data;
  },

  async remove(provider: AiProvider) {
    await apiRequest<null>(`/api/v1/ai-keys/${provider}`, { method: "DELETE" });
  },

  async test(provider: AiProvider) {
    const response = await apiRequest<AiKeyTestResult>(`/api/v1/ai-keys/${provider}/test`, { method: "POST" });

    return response.data;
  },
};
