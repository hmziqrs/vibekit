import { z } from 'zod/v4'

export const createFeatureFlagSchema = z.object({
  cohortRules: z.record(z.string(), z.unknown()).optional(),
  dependencies: z.array(z.string()).optional(),
  description: z.string().trim().min(1).max(500).optional(),
  enabled: z.boolean().optional(),
  environment: z
    .union([z.literal('development'), z.literal('staging'), z.literal('production')])
    .optional(),
  key: z.string().trim().min(1).max(100),
  killSwitch: z.boolean().optional(),
  name: z.string().trim().min(1).max(200),
  rolloutPercentage: z.number().int().min(0).max(100).optional(),
})

export const updateFeatureFlagSchema = z.object({
  cohortRules: z.record(z.string(), z.unknown()).optional(),
  dependencies: z.array(z.string()).optional(),
  description: z.string().trim().min(1).max(500).optional(),
  enabled: z.boolean().optional(),
  environment: z
    .union([z.literal('development'), z.literal('staging'), z.literal('production')])
    .optional(),
  killSwitch: z.boolean().optional(),
  name: z.string().trim().min(1).max(200).optional(),
  rolloutPercentage: z.number().int().min(0).max(100).optional(),
})

export const toggleFeatureFlagSchema = z.object({
  enabled: z.boolean(),
})

export const evaluateFlagSchema = z.object({
  context: z
    .object({
      environment: z.string().trim().max(50).optional(),
      userId: z.string().trim().max(200).optional(),
    })
    .optional(),
})

export const evaluateMultipleFlagsSchema = z.object({
  context: z
    .object({
      environment: z.string().trim().max(50).optional(),
      userId: z.string().trim().max(200).optional(),
    })
    .optional(),
  keys: z.array(z.string().min(1)).min(1).max(50),
})

export const listFeatureFlagsSchema = z.object({
  enabled: z
    .union([z.literal('true'), z.literal('false')])
    .transform((v) => v === 'true')
    .optional(),
  environment: z.string().trim().max(50).optional(),
})
