import { ApiRequestError, apiRequest } from "./api";

const RATE_LIMIT_MESSAGE = "Too many reset requests. Please wait a while and try again.";

/** Asks for a password reset email. The server answers the same way whether or not the account exists. */
export async function requestPasswordReset(email: string): Promise<string> {
  try {
    const response = await apiRequest<null>("/api/v1/users/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email: email.trim() }),
    });
    return response.message;
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 429) {
      throw new ApiRequestError(RATE_LIMIT_MESSAGE, 429);
    }
    throw error;
  }
}

/** True when the reset link is still usable. Network problems are surfaced rather than treated as "invalid". */
export async function validateResetToken(token: string): Promise<boolean> {
  const response = await apiRequest<{ valid: boolean }>(`/api/v1/users/reset-password/validate?token=${encodeURIComponent(token)}`);
  return Boolean(response.data?.valid);
}

export async function resetPassword(token: string, password: string): Promise<string> {
  const response = await apiRequest<null>("/api/v1/users/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, password }),
  });
  return response.message;
}
