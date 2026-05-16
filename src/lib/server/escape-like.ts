export const escapeLike = (s: string) =>
  s.replace(/%/g, String.raw`\%`).replace(/_/g, String.raw`\_`)
