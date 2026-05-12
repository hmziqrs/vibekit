import { createQuery, useQueryClient } from '@tanstack/svelte-query'

interface FlagEvaluation {
  enabled: boolean
  key: string
}

async function evaluateFlag(key: string, context?: { environment?: string; userId?: string }) {
  const res = await fetch(`/api/feature-flags/evaluate/${encodeURIComponent(key)}`, {
    body: JSON.stringify({ context }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  })
  if (!res.ok) return { enabled: false, key }
  return (await res.json()) as FlagEvaluation
}

export function useFeatureFlag(key: string, context?: { environment?: string; userId?: string }) {
  const query = createQuery<FlagEvaluation>({
    queryKey: ['feature-flag', key, context],
    queryFn: () => evaluateFlag(key, context),
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  })

  return {
    get enabled() {
      return query.current?.data?.enabled ?? false
    },
    get isLoading() {
      return query.current?.isLoading ?? true
    },
    query,
  }
}

export function useFeatureFlags(keys: string[]) {
  const queryClient = useQueryClient()

  const query = createQuery<Record<string, boolean>>({
    queryKey: ['feature-flags', keys],
    queryFn: async () => {
      const res = await fetch('/api/feature-flags/evaluate', {
        body: JSON.stringify({ keys }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      if (!res.ok) return {}
      return (await res.json()) as Record<string, boolean>
    },
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  })

  return {
    get flags() {
      return query.current?.data ?? {}
    },
    get isLoading() {
      return query.current?.isLoading ?? true
    },
    isEnabled(flagKey: string) {
      return query.current?.data?.[flagKey] ?? false
    },
    query,
    refresh() {
      void queryClient.invalidateQueries({ queryKey: ['feature-flags', keys] })
    },
  }
}
