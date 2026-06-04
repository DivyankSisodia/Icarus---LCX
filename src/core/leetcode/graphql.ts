import axios, { AxiosInstance } from "axios";
import { loadSecrets } from "../config/secrets";

export const LEETCODE_BASE = "https://leetcode.com";
export const LEETCODE_API = `${LEETCODE_BASE}/graphql`;

export function createAuthenticatedClient(): AxiosInstance | null {
  const secrets = loadSecrets();
  if (!secrets) return null;

  return axios.create({
    baseURL: LEETCODE_BASE,
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0",
      Cookie: `LEETCODE_SESSION=${secrets.LEETCODE_SESSION}; csrftoken=${secrets.csrftoken}`,
      "x-csrftoken": secrets.csrftoken,
      Referer: `${LEETCODE_BASE}/`,
      Origin: LEETCODE_BASE,
    },
    timeout: 15000,
  });
}

export async function graphqlQuery<T>(
  query: string,
  variables: Record<string, unknown> = {}
): Promise<T> {
  const client = createAuthenticatedClient();
  if (!client) {
    throw new Error(
      "Not authenticated. Run `lcx login` first to set your LeetCode session."
    );
  }

  const response = await client.post<{ data: T; errors?: unknown[] }>(
    LEETCODE_API,
    { query, variables },
    { headers: { "Content-Type": "application/json" } }
  );

  if (response.data.errors && response.data.errors.length > 0) {
    const messages = response.data.errors
      .map((e: unknown) => (e as { message?: string }).message || String(e))
      .join("; ");
    if (messages.includes("authentication") || messages.includes("session")) {
      throw new Error(
        "LeetCode session expired or invalid. Run `lcx login` to re-authenticate."
      );
    }
    throw new Error(`LeetCode API error: ${messages}`);
  }

  return response.data.data;
}

export async function graphqlQueryUnauthenticated<T>(
  query: string,
  variables: Record<string, unknown> = {}
): Promise<T> {
  const response = await axios.post<{ data: T; errors?: unknown[] }>(
    LEETCODE_API,
    { query, variables },
    {
      headers: {
        "Content-Type": "application/json",
        Referer: LEETCODE_BASE,
        Origin: LEETCODE_BASE,
      },
      timeout: 15000,
    }
  );

  if (response.data.errors && response.data.errors.length > 0) {
    const messages = response.data.errors
      .map((e: unknown) => (e as { message?: string }).message || String(e))
      .join("; ");
    throw new Error(`LeetCode API error: ${messages}`);
  }

  return response.data.data;
}
