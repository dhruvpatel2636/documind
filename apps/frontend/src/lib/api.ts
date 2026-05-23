const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

async function getAuthHeaders(): Promise<HeadersInit> {
  // Import dynamically to avoid SSR issues
  const { getSession } = await import("next-auth/react");
  const session = await getSession();
  if (!session) throw new Error("Not authenticated");

  // Fetch JWT token from our token endpoint
  const res = await fetch("/api/auth/token");
  if (!res.ok) throw new Error("Failed to get auth token");
  const { token } = await res.json();

  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export async function apiGet<T>(path: string): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BACKEND_URL}/api${path}`, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BACKEND_URL}/api${path}`, {
    method: "POST",
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function apiPut<T>(path: string, body?: unknown): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BACKEND_URL}/api${path}`, {
    method: "PUT",
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function apiDelete<T>(path: string): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BACKEND_URL}/api${path}`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function apiUpload<T>(
  path: string,
  formData: FormData,
): Promise<T> {
  const { getSession } = await import("next-auth/react");
  const session = await getSession();
  if (!session) throw new Error("Not authenticated");

  const tokenRes = await fetch("/api/auth/token");
  const { token } = await tokenRes.json();

  const res = await fetch(`${BACKEND_URL}/api${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Upload failed" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function streamChat(
  message: string,
  chatId: string | undefined,
  documentIds: string[] | undefined,
  onDelta: (delta: string) => void,
  onMeta: (meta: { chatId: string; sources: unknown[] }) => void,
  onDone: () => void,
  onError: (err: string) => void,
): Promise<void> {
  const tokenRes = await fetch("/api/auth/token");
  const { token } = await tokenRes.json();

  const res = await fetch(`${BACKEND_URL}/api/chat`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message, chatId, documentIds }),
  });

  if (!res.ok || !res.body) {
    onError("Failed to connect to chat service");
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      try {
        const data = JSON.parse(line.slice(6));
        if (data.type === "meta") onMeta(data);
        else if (data.type === "delta") onDelta(data.content);
        else if (data.type === "done") onDone();
        else if (data.type === "error") onError(data.message);
      } catch {
        // ignore parse errors
      }
    }
  }
}
