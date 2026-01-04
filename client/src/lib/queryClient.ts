import { QueryClient } from "@tanstack/react-query";

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown
): Promise<Response> {
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
        const res = await fetch(queryKey[0] as string, {
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
