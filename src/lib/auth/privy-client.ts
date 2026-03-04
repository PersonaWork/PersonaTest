import { usePrivy } from '@privy-io/react-auth';

type FetchInit = Omit<RequestInit, 'headers'> & { headers?: Record<string, string> };

export function usePrivyAuthedFetch() {
  const { getAccessToken } = usePrivy();

  return async function privyFetch(input: RequestInfo | URL, init: FetchInit = {}) {
    const token = await getAccessToken();
    const headers: Record<string, string> = {
      ...(init.headers || {}),
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return fetch(input, {
      ...init,
      headers,
    });
  };
}
