import type { HealthRecord } from '@/types/citizen'
import type { PinnedDataPoint } from '@/types/content'

interface HealthTabProps {
  health: HealthRecord
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

export function HealthTab({ health, onPin, pinnedIds }: HealthTabProps) {
  return (
    <div data-testid="health-tab" style={{ fontSize: 11, fontFamily: 'var(--font-mono)' }}>
      {health.conditions.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
            Conditions
          </div>
          <div style={{ color: 'var(--text-secondary)' }}>{health.conditions.join(', ')}</div>
        </div>
      )}

      {health.sensitive_conditions.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 9, color: 'var(--color-amber)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
            Sensitive Conditions
          </div>
          {health.sensitive_conditions.map((cond, i) => {
            const id = `condition_${i}`
            const pinned = pinnedIds.includes(id)
            return (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginRight: 8 }}>
                <span style={{ color: 'var(--color-amber)' }}>{cond}</span>
                <button
                  data-testid={`pin-health-condition-${i}`}
                  style={pinBtnStyle(pinned)}
                  aria-pressed={pinned}
                  onClick={() => onPin({
                    id,
                    domain: 'health',
                    label: cond,
                    category: 'sensitive_condition',
                  })}
                >
                  {pinned ? '● Pinned' : '○ Pin'}
                </button>
              </span>
            )
          })}
        </div>
      )}

      {health.medications.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
            Medications
          </div>
          <div style={{ color: 'var(--text-secondary)' }}>{health.medications.join(', ')}</div>
        </div>
      )}

      <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
        Recent Visits
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Reason</th>
            <th>Specialty</th>
            <th>Facility</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {health.visits.map((v, i) => {
            const id = `visit_${i}`
            const pinned = pinnedIds.includes(id)
            return (
              <tr key={i}>
                <td>{v.date}</td>
                <td>{v.reason}</td>
                <td>{v.specialty}</td>
                <td>{v.facility}</td>
                <td>
                  <button
                    data-testid={`pin-health-visit-${i}`}
                    style={pinBtnStyle(pinned)}
                    aria-pressed={pinned}
                    onClick={() => onPin({
                      id,
                      domain: 'health',
                      label: `${v.reason} — ${v.facility}`,
                      category: 'health_visit',
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
