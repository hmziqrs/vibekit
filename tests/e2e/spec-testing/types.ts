export type RenderingStrategy =
  | 'prerendered-no-csr'
  | 'prerendered-with-csr'
  | 'ssr-with-csr'
  | 'csr-only'
  | 'redirect'
  | 'error'
  | 'unknown'

export interface RouteConfig {
  path: string
  expectedStrategy: RenderingStrategy
  devStrategy: RenderingStrategy
  authenticatedStrategy?: RenderingStrategy
  description: string
  group: string
  requiresAuth: boolean
  requiresDb: boolean
}

export interface ServerEvidence {
  status: number
  html: string
  headers: Record<string, string>
  htmlSize: number
  bodyTextLength: number
  hasSvelteKitRuntime: boolean
  hasHydrationData: boolean
  hasScripts: boolean
  isPopulated: boolean
  isEmptyShell: boolean
}

export interface ClientEvidence {
  hydrated: boolean
  bodyTextLength: number
  finalHTMLSize: number
  bodyTextDelta: number
}

export interface StrategyDetection {
  strategy: RenderingStrategy
  explanation: string[]
}

export interface RouteResult {
  path: string
  group: string
  server: ServerEvidence
  client: ClientEvidence | null
  detected: RenderingStrategy
  expected: RenderingStrategy
  explanation: string[]
  pass: boolean
}
