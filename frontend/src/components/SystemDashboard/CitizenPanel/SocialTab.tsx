import type { SocialMediaRecord } from '@/types/citizen'
import type { PinnedDataPoint } from '@/types/content'

interface SocialTabProps {
  social: SocialMediaRecord
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

export function SocialTab({ social, onPin, pinnedIds }: SocialTabProps) {
  const flaggedConnections = social.connections.filter(c => c.is_flagged)

  return (
    <div data-testid="social-tab" style={{ fontSize: 11, fontFamily: 'var(--font-mono)' }}>
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
          Platforms
        </div>
        <div style={{ color: 'var(--text-secondary)' }}>{social.platforms.join(', ')}</div>
      </div>

      <div style={{ marginBottom: 10, display: 'flex', gap: 16 }}>
        <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>
          Connections: <span style={{ color: 'var(--text-primary)' }}>{social.connections.length}</span>
        </span>
        {flaggedConnections.length > 0 && (
          <span style={{ color: 'var(--color-red)', fontSize: 10 }}>
            Flagged: {flaggedConnections.length}
          </span>
        )}
      </div>

      {social.flagged_group_memberships.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 9, color: 'var(--color-red)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
            Flagged Groups
          </div>
          <div>
            {social.flagged_group_memberships.map((group, i) => {
              const id = `group_${i}`
              const pinned = pinnedIds.includes(id)
              return (
                <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginRight: 8 }}>
                  <span style={{ color: 'var(--color-red)' }}>{group}</span>
                  <button
                    data-testid={`pin-social-group-${i}`}
                    style={pinBtnStyle(pinned)}
                    aria-pressed={pinned}
                    onClick={() => onPin({
                      id,
                      domain: 'social',
                      label: group,
                      category: 'group_membership',
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

      {social.political_inferences.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 9, color: 'var(--color-amber)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
            Political Inferences
          </div>
          <div style={{ color: 'var(--color-amber)' }}>{social.political_inferences.join(', ')}</div>
        </div>
      )}

      <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
        Posts
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Platform</th>
            <th>Content</th>
            <th>Sentiment</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {social.posts.map((p, i) => {
            const id = `post_${i}`
            const pinned = pinnedIds.includes(id)
            return (
              <tr key={i} style={p.is_concerning ? { color: 'var(--color-amber)' } : undefined}>
                <td>{p.date}</td>
                <td>{p.platform}</td>
                <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.content.slice(0, 80)}{p.content.length > 80 ? '…' : ''}
                </td>
                <td>{p.is_concerning ? '⚠ CONCERNING' : 'Normal'}</td>
                <td>
                  <button
                    data-testid={`pin-social-post-${i}`}
                    style={pinBtnStyle(pinned)}
                    aria-pressed={pinned}
                    onClick={() => onPin({
                      id,
                      domain: 'social',
                      label: `${p.platform}: ${p.content.slice(0, 60)}`,
                      category: 'social_post',
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
