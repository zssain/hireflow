"use client";

import { useEffect, useState, useRef } from "react";
import { useAuthStore } from "@/stores/auth.store";
import { useTenantStore } from "@/stores/tenant.store";

interface CacheEntry {
  data: unknown;
  timestamp: number;
}

// Module-level cache shared across all hook instances
const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 30_000; // 30 seconds

// In-flight request deduplication
const inflight = new Map<string, Promise<unknown>>();

function getCached(key: string): unknown | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return undefined;
  }
  return entry.data;
}

/**
 * Cached data fetching hook.
 * - Deduplicates in-flight requests
 * - Returns cached data instantly on re-mount (e.g. navigating back)
 * - Revalidates in background after TTL
 */
export function useApiQuery<T>(
  path: string | null,
  options?: { transform?: (raw: unknown) => T }
): { data: T | null; loading: boolean; error: string | null; refetch: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  // Build cache key from path (includes tenant_id already)
  const cacheKey = path;

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchData = async (skipCache = false) => {
    if (!path) {
      setLoading(false);
      return;
    }

    const tenantId = useTenantStore.getState().activeTenantId;
    const user = useAuthStore.getState().firebaseUser;

    if (!tenantId || !user) {
      // Auth/tenant not ready yet — don't set loading false, wait for retry
      return;
    }

    const fullPath = path.includes("tenant_id")
      ? path
      : `${path}${path.includes("?") ? "&" : "?"}tenant_id=${tenantId}`;

    const fullCacheKey = fullPath;

    // Check cache first
    if (!skipCache) {
      const cached = getCached(fullCacheKey);
      if (cached !== undefined) {
        const transformed = options?.transform ? options.transform(cached) : (cached as T);
        setData(transformed);
        setLoading(false);
        return;
      }
    }

    // Deduplicate in-flight requests
    let promise = inflight.get(fullCacheKey);
    if (!promise) {
      promise = (async () => {
        const token = await user.getIdToken();
        const res = await fetch(`/api${fullPath}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`API error ${res.status}`);
        return res.json();
      })();
      inflight.set(fullCacheKey, promise);
    }

    try {
      const raw = await promise;
      cache.set(fullCacheKey, { data: raw, timestamp: Date.now() });
      if (mountedRef.current) {
        const transformed = options?.transform ? options.transform(raw) : (raw as T);
        setData(transformed);
        setError(null);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : "Fetch failed");
      }
    } finally {
      inflight.delete(fullCacheKey);
      if (mountedRef.current) setLoading(false);
    }
  };

  // Re-run when path changes or when auth/tenant become available
  const tenantId = useTenantStore((s) => s.activeTenantId);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, tenantId, isAuthenticated]);

  const refetch = () => {
    setLoading(true);
    fetchData(true);
  };

  return { data, loading, error, refetch };
}

/** Invalidate cache entries matching a prefix */
export function invalidateCache(pathPrefix?: string) {
  if (!pathPrefix) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.includes(pathPrefix)) cache.delete(key);
  }
}
