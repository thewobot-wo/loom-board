/**
 * Thin fetch wrapper for calling Convex HTTP action endpoints.
 * Uses plain fetch instead of ConvexHttpClient to keep the MCP server lightweight.
 */

const CONVEX_SITE_URL = process.env.CONVEX_SITE_URL;
const MCP_API_TOKEN = process.env.MCP_API_TOKEN;

if (!CONVEX_SITE_URL) {
  throw new Error(
    "CONVEX_SITE_URL environment variable is required. " +
      "Set it to your Convex deployment site URL (e.g., https://your-deployment.convex.site)"
  );
}

if (!MCP_API_TOKEN) {
  throw new Error(
    "MCP_API_TOKEN environment variable is required. " +
      "Set it to the API token configured in your Convex deployment."
  );
}

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function callMcpApi(
  path: string,
  options?: { method?: string; body?: unknown }
): Promise<unknown> {
  const url = `${CONVEX_SITE_URL}${path}`;
  const method = options?.method ?? "GET";

  const headers: Record<string, string> = {
    Authorization: `Bearer ${MCP_API_TOKEN}`,
    "Content-Type": "application/json",
  };

  const fetchOptions: RequestInit = {
    method,
    headers,
  };

  if (options?.body !== undefined) {
    fetchOptions.body = JSON.stringify(options.body);
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, fetchOptions);

      // Do not retry on client errors (4xx)
      if (response.status >= 400 && response.status < 500) {
        const errorData = await response.json().catch(() => ({
          error: response.statusText,
        }));
        throw new Error(
          (errorData as { error?: string }).error ??
            `HTTP ${response.status}: ${response.statusText}`
        );
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: response.statusText,
        }));
        throw new Error(
          (errorData as { error?: string }).error ??
            `HTTP ${response.status}: ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Do not retry on client errors (already thrown above with specific message)
      const isClientError =
        lastError.message.includes("HTTP 4") ||
        lastError.message === "Unauthorized";
      if (isClientError) {
        throw lastError;
      }

      // Retry on network/server errors
      if (attempt < MAX_RETRIES) {
        console.error(
          `MCP API request failed (attempt ${attempt + 1}/${MAX_RETRIES + 1}): ${lastError.message}. Retrying in ${RETRY_DELAY_MS}ms...`
        );
        await sleep(RETRY_DELAY_MS);
      }
    }
  }

  throw lastError ?? new Error("MCP API request failed after retries");
}
