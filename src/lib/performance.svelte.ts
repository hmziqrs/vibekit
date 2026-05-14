interface WebVitalMetric {
  delta: number
  entries: PerformanceEntry[]
  id: string
  name: string
  rating: 'good' | 'needs-improvement' | 'poor'
  value: number
}

type MetricCallback = (metric: WebVitalMetric) => void

const callbacks: MetricCallback[] = []

export function onWebVital(cb: MetricCallback): () => void {
  callbacks.push(cb)
  return () => {
    const idx = callbacks.indexOf(cb)
    if (idx !== -1) callbacks.splice(idx, 1)
  }
}

function emit(metric: WebVitalMetric): void {
  for (const cb of callbacks) cb(metric)
}

function getRating(
  value: number,
  thresholds: [number, number]
): 'good' | 'needs-improvement' | 'poor' {
  if (value <= thresholds[0]) return 'good'
  if (value <= thresholds[1]) return 'needs-improvement'
  return 'poor'
}

function observeLCP(): void {
  try {
    const po = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const last = entries[entries.length - 1]
      if (last) {
        emit({
          delta: last.startTime,
          entries,
          id: 'v3-'.concat(Date.now().toString(36)),
          name: 'LCP',
          rating: getRating(last.startTime, [2500, 4000]),
          value: last.startTime,
        })
      }
    })
    po.observe({ buffered: true, type: 'largest-contentful-paint' })
  } catch (error) {
    console.error('Failed to observe LCP', error)
  }
}

function observeCLS(): void {
  try {
    let clsValue = 0
    let clsEntries: PerformanceEntry[] = []
    let sessionValue = 0
    let sessionEntries: PerformanceEntry[] = []

    const po = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!(entry as PerformanceEntry & { hadRecentInput: boolean }).hadRecentInput) {
          const [firstSessionEntry] = sessionEntries
          const lastSessionEntry = sessionEntries[sessionEntries.length - 1]

          if (
            firstSessionEntry &&
            lastSessionEntry &&
            entry.startTime - lastSessionEntry.startTime < 1000 &&
            entry.startTime - firstSessionEntry.startTime < 5000
          ) {
            sessionValue += (entry as LayoutShift).value
            sessionEntries.push(entry)
          } else {
            sessionValue = (entry as LayoutShift).value
            sessionEntries = [entry]
          }

          if (sessionValue > clsValue) {
            clsValue = sessionValue
            clsEntries = sessionEntries
          }
        }
      }

      emit({
        delta: clsValue,
        entries: clsEntries,
        id: 'v3-'.concat(Date.now().toString(36)),
        name: 'CLS',
        rating: getRating(clsValue, [0.1, 0.25]),
        value: clsValue,
      })
    })
    po.observe({ buffered: true, type: 'layout-shift' })
  } catch (error) {
    console.error('Failed to observe CLS', error)
  }
}

function observeINP(): void {
  try {
    let worst = 0
    let worstEntries: PerformanceEntry[] = []

    const po = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const { duration } = entry as PerformanceEntry & { duration: number }
        if (duration > worst) {
          worst = duration
          worstEntries = [entry]
        }
      }
    })
    po.observe({ buffered: true, type: 'event' })

    // Report on page hide
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && worst > 0) {
        emit({
          delta: worst,
          entries: worstEntries,
          id: 'v3-'.concat(Date.now().toString(36)),
          name: 'INP',
          rating: getRating(worst, [200, 500]),
          value: worst,
        })
      }
    })
  } catch (error) {
    console.error('Failed to observe INP', error)
  }
}

interface LayoutShift extends PerformanceEntry {
  value: number
  hadRecentInput: boolean
}

export function initWebVitals(): void {
  if (typeof window === 'undefined') return
  if (!('PerformanceObserver' in window)) return

  observeLCP()
  observeCLS()
  observeINP()
}

function ratingColor(rating: string): string {
  if (rating === 'good') return '#0cce6a'
  if (rating === 'needs-improvement') return '#ffa400'
  return '#ff4e42'
}

export function reportToConsole(): () => void {
  if (!import.meta.env.DEV) return () => {}

  return onWebVital((metric) => {
    const color = ratingColor(metric.rating)
    console.log(
      `%c${metric.name}%c ${metric.value.toFixed(2)} (${metric.rating})`,
      `color:${color};font-weight:bold`,
      'color:inherit'
    )
  })
}
