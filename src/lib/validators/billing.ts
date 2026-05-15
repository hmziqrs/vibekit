import { z } from 'zod/v4'

export const createPlanSchema = z.object({
  currency: z.string().trim().length(3).optional(),
  description: z.string().trim().max(500).optional(),
  features: z.array(z.string().trim().max(100)).max(20).optional(),
  interval: z.enum(['month', 'year']),
  isActive: z.boolean().optional(),
  name: z.string().trim().min(1).max(100),
  priceInCents: z.number().int().min(0),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9-]+$/),
  sortOrder: z.number().int().min(0).optional(),
  stripePriceId: z.string().trim().max(100).optional(),
  taxInclusive: z.boolean().optional(),
  taxRate: z.number().int().min(0).max(10_000).optional(),
  trialDays: z.number().int().min(0).optional(),
})

export const updatePlanSchema = z.object({
  currency: z.string().trim().length(3).optional(),
  description: z.string().trim().max(500).optional().nullable(),
  features: z.array(z.string().trim().max(100)).max(20).optional(),
  interval: z.enum(['month', 'year']).optional(),
  isActive: z.boolean().optional(),
  name: z.string().trim().min(1).max(100).optional(),
  priceInCents: z.number().int().min(0).optional(),
  sortOrder: z.number().int().min(0).optional(),
  stripePriceId: z.string().trim().max(100).optional().nullable(),
  taxInclusive: z.boolean().optional(),
  taxRate: z.number().int().min(0).max(10_000).optional().nullable(),
  trialDays: z.number().int().min(0).optional(),
})

export const checkoutSessionSchema = z.object({
  cancelUrl: z.string().trim().min(1).max(2000),
  organizationId: z.string().trim().min(1).optional(),
  planId: z.string().trim().min(1),
  successUrl: z.string().trim().min(1).max(2000),
})

export const changePlanSchema = z.object({
  newPlanId: z.string().trim().min(1),
  organizationId: z.string().trim().min(1).optional(),
})

export const recordUsageSchema = z.object({
  metricType: z.enum(['api_calls', 'requests', 'seats', 'storage']),
  quantity: z.number().int().min(1),
})

export const refundSchema = z.object({
  amountInCents: z.number().int().min(1).max(1_000_000_000).optional(),
  invoiceId: z.string().trim().min(1),
  reason: z.enum(['duplicate', 'fraudulent', 'requested_by_customer']).optional(),
})

export const createCouponSchema = z.object({
  active: z.boolean().optional(),
  code: z
    .string()
    .trim()
    .min(3)
    .max(50)
    .regex(/^[A-Z0-9-]+$/),
  currency: z.string().trim().length(3).optional(),
  duration: z.enum(['forever', 'once', 'repeating']).optional(),
  durationInMonths: z.number().int().min(1).optional(),
  maxRedemptions: z.number().int().min(1).optional(),
  name: z.string().trim().min(1).max(100),
  percentOff: z.number().int().min(1).max(100),
  redeemBy: z.number().int().positive().optional(),
})

export const updateCouponSchema = z.object({
  active: z.boolean().optional(),
  name: z.string().trim().min(1).max(100).optional(),
})

export const redeemCouponSchema = z.object({
  code: z.string().trim().min(1),
})

export const portalSessionSchema = z.object({
  returnUrl: z.string().trim().min(1).max(2000),
})

export const paymentMethodIdSchema = z.object({
  paymentMethodId: z.string().trim().min(1),
})
