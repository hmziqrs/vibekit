import { z } from 'zod/v4'

import { name } from './common'

const teamRoleEnum = z.enum(['lead', 'member'])

export const createTeamSchema = z.object({
  description: z.string().max(500, 'Description must be at most 500 characters').trim().optional(),
  name,
})

export const updateTeamSchema = z.object({
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

export const addTeamMemberSchema = z.object({
  role: teamRoleEnum.default('member'),
  userId: z.string().min(1, 'User ID is required'),
})

export const updateTeamMemberRoleSchema = z.object({
  role: teamRoleEnum,
})

export type CreateTeamInput = z.infer<typeof createTeamSchema>
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>
export type AddTeamMemberInput = z.infer<typeof addTeamMemberSchema>
export type UpdateTeamMemberRoleInput = z.infer<typeof updateTeamMemberRoleSchema>
