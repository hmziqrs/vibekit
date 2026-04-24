import type { StandardSchemaV1Issue } from '@tanstack/form-core'

export function getFieldError(errors: StandardSchemaV1Issue[]): string | undefined {
  return errors[0]?.message
}

export function getFieldErrors(errors: StandardSchemaV1Issue[]): string[] {
  return errors.map((err) => err.message)
}
