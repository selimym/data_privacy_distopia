import type { MessageRecord } from '@/types/citizen'
import type { PinnedDataPoint } from '@/types/content'

interface MessagesTabProps {
  messages: MessageRecord[]
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

export function MessagesTab({ messages, onPin, pinnedIds }: MessagesTabProps) {
  return (
    <div data-testid="messages-tab" style={{ fontSize: 11, fontFamily: 'var(--font-mono)' }}>
      <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
        Messages ({messages.length})
      </div>
      {messages.length === 0 ? (
        <div style={{ color: 'var(--text-muted)' }}>No messages on record.</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Contact</th>
              <th>Platform</th>
              <th>Preview</th>
              <th>Encrypted</th>
              <th>Category</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {messages.map((m, i) => {
              const id = `message_${i}`
              const pinned = pinnedIds.includes(id)
              return (
                <tr
                  key={m.id}
                  style={m.is_concerning ? { color: 'var(--color-amber)' } : undefined}
                >
                  <td>{m.date}</td>
                  <td>{m.contact}</td>
                  <td>{m.platform}</td>
                  <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.excerpt.slice(0, 60)}{m.excerpt.length > 60 ? '…' : ''}
                  </td>
                  <td>{m.is_encrypted ? '🔒 YES' : 'No'}</td>
                  <td style={{ textTransform: 'capitalize' }}>{m.category.replace('_', ' ')}</td>
                  <td>
                    <button
                      data-testid={`pin-message-${i}`}
                      style={pinBtnStyle(pinned)}
                      aria-pressed={pinned}
                      onClick={() => onPin({
                        id,
                        domain: 'messages',
                        label: `${m.contact}: "${m.excerpt}"`,
                        category: m.category,
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
      )}
    </div>
  )
}
