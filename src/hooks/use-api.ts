"use client";

import { useCallback } from "react";
import { useAuth } from "./use-auth";
import { useTenant } from "./use-tenant";

export function useApi() {
  const { getToken } = useAuth();
  const { tenantId } = useTenant();

  const apiFetch = useCallback(
    async (path: string, options?: RequestInit): Promise<Response | null> => {
      if (!tenantId) return null;
      const token = await getToken();
      if (!token) return null;

      const separator = path.includes("?") ? "&" : "?";
      const url = `${path}${separator}tenant_id=${tenantId}`;

      return fetch(url, {
        ...options,
        headers: {
          Authorization: `Bearer ${token}`,
          ...options?.headers,
        },
      });
    },
    [tenantId, getToken]
  );

  return { apiFetch, tenantId, isReady: !!tenantId };
}
