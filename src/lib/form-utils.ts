function hasFormProperty(err: unknown): err is { form: unknown } {
  return typeof err === 'object' && err !== null && 'form' in err
}

export function extractFormError(err: unknown): string | undefined {
  if (hasFormProperty(err)) {
    return typeof err.form === 'string' ? err.form : undefined
  }
  return undefined
}
