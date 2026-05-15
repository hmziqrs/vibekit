import { z } from 'zod/v4'

export const EXPERIMENT_STATUSES = ['draft', 'running', 'paused', 'completed', 'archived'] as const

export const createExperimentSchema = z.object({
  description: z.string().trim().min(1).max(1000).optional(),
  key: z.string().trim().min(1).max(100),
  name: z.string().trim().min(1).max(200),
  targetMetric: z.string().trim().min(1).max(200),
  variants: z
    .array(
      z.object({
        description: z.string().trim().max(500).optional(),
        isControl: z.boolean().optional(),
        name: z.string().trim().min(1).max(100),
        payload: z.record(z.string(), z.unknown()).optional(),
        trafficPercentage: z.number().int().min(1).max(100),
      })
    )
    .min(2)
    .max(10),
})

export const updateExperimentSchema = z.object({
  description: z.string().trim().min(1).max(1000).optional(),
  endDate: z.string().datetime().optional(),
  name: z.string().trim().min(1).max(200).optional(),
  startDate: z.string().datetime().optional(),
  status: z.enum(EXPERIMENT_STATUSES).optional(),
  winningVariantId: z.string().nullable().optional(),
})

export const assignVariantSchema = z.object({
  sessionId: z.string().trim().min(1).max(100).optional(),
  userId: z.string().trim().min(1).max(100).optional(),
})

export const recordEventSchema = z.object({
  eventName: z.string().trim().min(1).max(200),
  eventType: z.enum(['exposure', 'conversion', 'custom']),
  eventValue: z.number().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  sessionId: z.string().max(100).optional(),
  userId: z.string().max(100).optional(),
})

export const listExperimentsSchema = z.object({
  status: z.enum(EXPERIMENT_STATUSES).optional(),
})
