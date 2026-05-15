import { DEFAULT_WEIGHTS, type SearchWeights } from '$lib/server/search/adapter-d1'
import { describe, expect, it } from 'vitest'

describe('search relevance weights', () => {
  it('has default weights with title boosted highest', () => {
    expect(DEFAULT_WEIGHTS.title).toBe(10.0)
    expect(DEFAULT_WEIGHTS.content).toBe(1.0)
    expect(DEFAULT_WEIGHTS.metadata).toBe(0.5)
    expect(DEFAULT_WEIGHTS.entityType).toBe(0.0)
  })

  it('title weight is significantly higher than content', () => {
    expect(DEFAULT_WEIGHTS.title / DEFAULT_WEIGHTS.content).toBe(10)
  })

  it('entity type has zero weight (not a search target)', () => {
    expect(DEFAULT_WEIGHTS.entityType).toBe(0.0)
  })

  it('metadata has lower weight than content', () => {
    expect(DEFAULT_WEIGHTS.metadata).toBeLessThan(DEFAULT_WEIGHTS.content)
  })

  it('allows custom weight overrides', () => {
    const custom: SearchWeights = { ...DEFAULT_WEIGHTS, title: 20.0, content: 2.0 }
    expect(custom.title).toBe(20.0)
    expect(custom.content).toBe(2.0)
    expect(custom.metadata).toBe(0.5) // inherited default
  })

  it('weight distribution makes sense', () => {
    // Title matches should always score highest
    expect(DEFAULT_WEIGHTS.title).toBeGreaterThan(DEFAULT_WEIGHTS.content)
    expect(DEFAULT_WEIGHTS.title).toBeGreaterThan(DEFAULT_WEIGHTS.metadata)
    expect(DEFAULT_WEIGHTS.content).toBeGreaterThan(DEFAULT_WEIGHTS.metadata)
    expect(DEFAULT_WEIGHTS.content).toBeGreaterThan(DEFAULT_WEIGHTS.entityType)
  })

  it('bm25 column order matches FTS5 table definition', () => {
    // FTS5 columns: entity_type, entity_id, title, content, metadata
    // bm25() args: entity_type weight, entity_id weight (0), title weight, content weight, metadata weight
    const args = [
      DEFAULT_WEIGHTS.entityType,
      0.0, // entity_id not searchable
      DEFAULT_WEIGHTS.title,
      DEFAULT_WEIGHTS.content,
      DEFAULT_WEIGHTS.metadata,
    ]
    expect(args).toEqual([0.0, 0.0, 10.0, 1.0, 0.5])
  })
})
