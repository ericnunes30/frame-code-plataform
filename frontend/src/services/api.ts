const API_BASE_PATH = (import.meta as ImportMeta).env?.VITE_API_BASE_URL || '/api/v1';

function buildUrl(endpoint: string) {
  return `${API_BASE_PATH}${endpoint}`;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(text || `API Error: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

export const api = {
  async get<T>(endpoint: string, params?: Record<string, unknown>): Promise<T> {
    const url = new URL(buildUrl(endpoint), window.location.origin);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) url.searchParams.append(key, String(value));
      });
    }
    const response = await fetch(url.toString(), {
      credentials: 'include',
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    });
    return handleResponse<T>(response);
  },

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    const response = await fetch(buildUrl(endpoint), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: data ? JSON.stringify(data) : undefined,
      credentials: 'include',
    });
    return handleResponse<T>(response);
  },

  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    const response = await fetch(buildUrl(endpoint), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: data ? JSON.stringify(data) : undefined,
      credentials: 'include',
    });
    return handleResponse<T>(response);
  },

  async delete<T>(endpoint: string): Promise<T> {
    const response = await fetch(buildUrl(endpoint), {
      method: 'DELETE',
      credentials: 'include',
    });
    return handleResponse<T>(response);
  },
};
