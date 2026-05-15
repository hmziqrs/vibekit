export const CURRENT_TERMS_VERSION = '2'

export function needsTermsAcceptance(acceptedVersion: string | null): boolean {
  return acceptedVersion !== CURRENT_TERMS_VERSION
}
