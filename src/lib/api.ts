const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

type ApiOptions = {
  token?: string;
  adminToken?: string | null;
};

export async function apiGet<T>(path: string, options: ApiOptions = {}) {
  return apiRequest<T>(path, { method: "GET" }, options);
}

export async function apiPost<T>(path: string, body: unknown, options: ApiOptions = {}) {
  return apiRequest<T>(
    path,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    },
    options
  );
}

export async function apiPatch<T>(path: string, body: unknown, options: ApiOptions = {}) {
  return apiRequest<T>(
    path,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    },
    options
  );
}

async function apiRequest<T>(path: string, init: RequestInit, options: ApiOptions) {
  const headers = new Headers(init.headers);
  const token = options.adminToken || options.token;
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error || `API_${response.status}`);
  }
  return payload;
}
