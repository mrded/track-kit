// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LapList } from '../LapList.tsx'
import type { Lap } from '../../parser/types.ts'

function makeLap(overrides: Partial<Lap>): Lap {
  return {
    id: crypto.randomUUID(),
    index: 0,
    durationMs: 155_300,
    samples: [],
    timeString: '2:35.30',
    isComplete: true,
    ...overrides,
  }
}

describe('LapList', () => {
  it('does not show incomplete badge on complete laps', () => {
    const laps = [makeLap({ isComplete: true })]
    render(<LapList laps={laps} selectedIds={new Set()} onToggle={vi.fn()} />)
    expect(screen.queryByText('incomplete')).not.toBeInTheDocument()
  })

  it('shows incomplete badge on incomplete laps', () => {
    const laps = [makeLap({ isComplete: false })]
    render(<LapList laps={laps} selectedIds={new Set()} onToggle={vi.fn()} />)
    expect(screen.getByText('incomplete')).toBeInTheDocument()
  })

  it('shows incomplete badge only on incomplete laps in a mixed list', () => {
    const laps = [
      makeLap({ isComplete: false }),
      makeLap({ isComplete: true }),
      makeLap({ isComplete: true }),
      makeLap({ isComplete: false }),
    ]
    render(<LapList laps={laps} selectedIds={new Set()} onToggle={vi.fn()} />)
    expect(screen.getAllByText('incomplete')).toHaveLength(2)
  })
})
