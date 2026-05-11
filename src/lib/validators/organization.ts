import { z } from 'zod/v4'

import { name } from './common'

const orgRoleEnum = z.enum(['owner', 'admin', 'member', 'viewer'])
const inviteRoleEnum = z.enum(['admin', 'member', 'viewer'])

export const createOrganizationSchema = z.object({
  description: z.string().max(500, 'Description must be at most 500 characters').trim().optional(),
  name,
})

export const updateOrganizationSchema = z.object({
  description: z
    .string()
    .max(500, 'Description must be at most 500 characters')
    .trim()
    .optional()
    .nullable(),
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be at most 100 characters')
    .trim(),
})

export const updateMemberRoleSchema = z.object({
  role: orgRoleEnum,
})

export const inviteMemberSchema = z.object({
  email: z.email('Please enter a valid email address'),
  role: inviteRoleEnum.default('member'),
})

export const transferOwnershipSchema = z.object({
  newOwnerId: z.string().min(1, 'New owner ID is required'),
})

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>
export type TransferOwnershipInput = z.infer<typeof transferOwnershipSchema>
