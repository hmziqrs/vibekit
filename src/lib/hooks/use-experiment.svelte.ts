import { createMutation, createQuery } from '@tanstack/svelte-query'

interface Variant {
  id: string
  isControl: boolean
  name: string
  payload: Record<string, unknown>
}

export function useExperiment(
  experimentKey: string,
  options?: { sessionId?: string; userId?: string }
) {
  const query = createQuery(() => ({
    enabled: !!experimentKey,
    queryFn: async () => {
      const res = await fetch(`/api/experiments/${encodeURIComponent(experimentKey)}/assign`, {
        body: JSON.stringify({ sessionId: options?.sessionId, userId: options?.userId }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      if (!res.ok) return null as never
      return (await res.json()) as { experiment: { key: string }; variant: Variant }
    },
    queryKey: ['experiment', experimentKey, options],
    refetchOnWindowFocus: false,
    staleTime: 300_000,
  }))

  const trackMutation = createMutation(() => ({
    mutationFn: async ({
      eventName,
      eventType = 'custom',
      eventValue,
      metadata,
    }: {
      eventName: string
      eventType?: 'conversion' | 'custom' | 'exposure'
      eventValue?: number
      metadata?: Record<string, unknown>
    }) => {
      const res = await fetch(`/api/experiments/${encodeURIComponent(experimentKey)}/event`, {
        body: JSON.stringify({ eventName, eventType, eventValue, metadata }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      if (!res.ok) throw new Error('Failed to track event')
      return res.json()
    },
  }))

  return {
    get isControl() {
      return query.data?.variant?.isControl ?? false
    },
    get isLoading() {
      return query.isPending
    },
    query,
    track(event: {
      eventName: string
      eventType?: 'conversion' | 'custom' | 'exposure'
      eventValue?: number
      metadata?: Record<string, unknown>
    }) {
      trackMutation.mutate(event)
    },
    get variant() {
      return query.data?.variant ?? null
    },
  }
}
