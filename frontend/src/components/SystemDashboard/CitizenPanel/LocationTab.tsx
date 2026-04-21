import type { LocationRecord } from '@/types/citizen'
import type { PinnedDataPoint } from '@/types/content'

interface LocationTabProps {
  location: LocationRecord
  onPin: (point: PinnedDataPoint) => void
  pinnedIds: string[]
}

const pinBtnStyle = (pinned: boolean): React.CSSProperties => ({
  fontFamily: 'var(--font-mono)',
  fontSize: 9,
  cursor: 'pointer',
  background: 'transparent',
  border: `1px solid ${pinned ? 'var(--color-amber)' : 'var(--border-subtle)'}`,
  color: pinned ? 'var(--color-amber)' : 'var(--text-muted)',
  padding: '1px 5px',
  letterSpacing: '0.04em',
  verticalAlign: 'middle',
})

export function LocationTab({ location, onPin, pinnedIds }: LocationTabProps) {
  return (
    <div data-testid="location-tab" style={{ fontSize: 11, fontFamily: 'var(--font-mono)' }}>
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
          Home
        </div>
        <div style={{ color: 'var(--text-secondary)' }}>{location.home_address}</div>
      </div>

      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
          Work
        </div>
        <div style={{ color: 'var(--text-secondary)' }}>
          {location.work_name} — {location.work_address}
        </div>
      </div>

      {location.flagged_locations.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 9, color: 'var(--color-red)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
            Flagged Locations
          </div>
          <div>
            {location.flagged_locations.map((loc, i) => {
              const id = `flagged_${i}`
              const pinned = pinnedIds.includes(id)
              return (
                <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginRight: 8 }}>
                  <span style={{ color: 'var(--color-red)' }}>{loc}</span>
                  <button
                    data-testid={`pin-location-flagged-${i}`}
                    style={pinBtnStyle(pinned)}
                    aria-pressed={pinned}
                    onClick={() => onPin({
                      id,
                      domain: 'location',
                      label: loc,
                      category: 'flagged_location',
                    })}
                  >
                    {pinned ? '● Pinned' : '○ Pin'}
                  </button>
                </span>
              )
            })}
          </div>
        </div>
      )}

      <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
        Check-ins
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Location</th>
            <th>Type</th>
            <th>Frequency</th>
            <th>Address</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {location.checkins.map((c, i) => {
            const id = `checkin_${i}`
            const pinned = pinnedIds.includes(id)
            return (
              <tr key={i}>
                <td>{c.date}</td>
                <td>{c.location_name}</td>
                <td>{c.location_type}</td>
                <td>{c.frequency}</td>
                <td>{c.address}</td>
                <td>
                  <button
                    data-testid={`pin-location-checkin-${i}`}
                    style={pinBtnStyle(pinned)}
                    aria-pressed={pinned}
                    onClick={() => onPin({
                      id,
                      domain: 'location',
                      label: `${c.location_name} — ${c.date}`,
                      category: 'location_checkin',
                    })}
                  >
                    {pinned ? '● Pinned' : '○ Pin'}
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
