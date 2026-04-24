export type RenderingStrategy =
  | 'prerendered-no-csr'
  | 'prerendered-with-csr'
  | 'ssr-no-csr'
  | 'ssr-with-csr'
  | 'csr-only'
  | 'redirect'
  | 'unknown'

export interface RouteConfig {
  path: string
  expectedStrategy: RenderingStrategy
  description: string
  group: string
}
