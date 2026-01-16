import { QueryClient } from "@tanstack/react-query";
import { Capacitor } from "@capacitor/core";
import { CapacitorHttp, HttpResponse } from "@capacitor/core";

// Get the API base URL - empty for web (relative URLs), full URL for native
function getApiBaseUrl(): string {
  if (Capacitor.isNativePlatform()) {
    // For native apps, use the configured backend URL
    return import.meta.env.VITE_API_URL || '';
  }
  // For web, use relative URLs
  return '';
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown
): Promise<Response> {
  const baseUrl = getApiBaseUrl();
  const fullUrl = baseUrl ? `${baseUrl}${url}` : url;

  // Use native HTTP on iOS/Android for proper cookie handling
  if (Capacitor.isNativePlatform()) {
    const response: HttpResponse = await CapacitorHttp.request({
      method,
      url: fullUrl,
      headers: data ? { "Content-Type": "application/json" } : {},
      data: data ? data : undefined,
      webFetchExtra: {
        credentials: 'include',
      },
    });

    // Convert to Response-like object for compatibility
    const responseBody = typeof response.data === 'string'
      ? response.data
      : JSON.stringify(response.data);

    if (response.status < 200 || response.status >= 300) {
      throw new Error(responseBody || `Request failed with status ${response.status}`);
    }

    return {
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      statusText: '',
      json: async () => response.data,
      text: async () => responseBody,
    } as Response;
  }

  // Original fetch for web
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }

  return res;
}

type QueryFnOptions = {
  on401?: "returnNull" | "throw";
};

export function getQueryFn(options: QueryFnOptions = {}) {
  return async ({ queryKey }: { queryKey: string[] }) => {
    const baseUrl = getApiBaseUrl();
    const fullUrl = baseUrl ? `${baseUrl}${queryKey[0]}` : queryKey[0];

    // Use native HTTP on iOS/Android
    if (Capacitor.isNativePlatform()) {
      const response: HttpResponse = await CapacitorHttp.request({
        method: 'GET',
        url: fullUrl,
        webFetchExtra: {
          credentials: 'include',
        },
      });

      if (response.status === 401 && options.on401 === "returnNull") {
        return null;
      }

      if (response.status < 200 || response.status >= 300) {
        if (response.status >= 500) {
          throw new Error(`${response.status}: Server Error`);
        }
        throw new Error(`${response.status}: ${typeof response.data === 'string' ? response.data : JSON.stringify(response.data)}`);
      }

      return response.data;
    }

    // Original fetch for web
    const res = await fetch(queryKey[0], {
      credentials: "include",
    });

    if (res.status === 401 && options.on401 === "returnNull") {
      return null;
    }

    if (!res.ok) {
      if (res.status >= 500) {
        throw new Error(`${res.status}: ${res.statusText}`);
      }
      throw new Error(`${res.status}: ${await res.text()}`);
    }

    return res.json();
  };
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        const baseUrl = getApiBaseUrl();
        const url = queryKey[0] as string;
        const fullUrl = baseUrl ? `${baseUrl}${url}` : url;

        // Use native HTTP on iOS/Android
        if (Capacitor.isNativePlatform()) {
          const response: HttpResponse = await CapacitorHttp.request({
            method: 'GET',
            url: fullUrl,
            webFetchExtra: {
              credentials: 'include',
            },
          });

          if (response.status < 200 || response.status >= 300) {
            if (response.status >= 500) {
              throw new Error(`${response.status}: Server Error`);
            }
            throw new Error(`${response.status}: ${typeof response.data === 'string' ? response.data : JSON.stringify(response.data)}`);
          }

          return response.data;
        }

        // Original fetch for web
        const res = await fetch(url, {
          credentials: "include",
        });

        if (!res.ok) {
          if (res.status >= 500) {
            throw new Error(`${res.status}: ${res.statusText}`);
          }

          throw new Error(`${res.status}: ${await res.text()}`);
        }

        return res.json();
      },
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    }
  },
});
