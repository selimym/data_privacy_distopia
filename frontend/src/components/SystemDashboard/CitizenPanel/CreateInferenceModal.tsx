import { useState } from 'react'
import type { PinnedDataPoint, PlayerRule } from '../../../types/content'
import type { DomainKey } from '../../../types/game'
import { useContentStore } from '../../../stores/contentStore'
import { useGameStore } from '../../../stores/gameStore'

interface CreateInferenceModalProps {
  pinnedPoints: PinnedDataPoint[]
  onClose: () => void
  onCreated: () => void
}

const DOMAIN_COLORS: Record<DomainKey, string> = {
  health: '#ef4444',
  finance: '#f59e0b',
  social: '#8b5cf6',
  judicial: '#6b7280',
  messages: '#3b82f6',
  location: '#10b981',
}

const DOMAIN_LABELS: Record<DomainKey, string> = {
  health: 'HEALTH',
  finance: 'FINANCE',
  social: 'SOCIAL',
  judicial: 'JUDICIAL',
  messages: 'MESSAGES',
  location: 'LOCATION',
}

const DOMAIN_TO_CATEGORY: Record<DomainKey, string> = {
  finance: 'financial',
  health: 'health',
  social: 'social',
  judicial: 'behavioral',
  messages: 'behavioral',
  location: 'location',
}

const THREAT_LEVELS = [
  { value: 1, label: 'MINIMAL', color: '#6b7280' },
  { value: 2, label: 'LOW', color: '#3b82f6' },
  { value: 3, label: 'MEDIUM', color: '#f59e0b' },
  { value: 4, label: 'HIGH', color: '#ef4444' },
  { value: 5, label: 'CRITICAL', color: '#dc2626' },
] as const

function deriveCategoryFromDomains(domains: DomainKey[]): string {
  if (domains.length === 0) return 'behavioral'
  const cats = domains.map(d => DOMAIN_TO_CATEGORY[d])
  const counts: Record<string, number> = {}
  for (const c of cats) counts[c] = (counts[c] ?? 0) + 1
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'behavioral'
}

export function CreateInferenceModal({ pinnedPoints, onClose, onCreated }: CreateInferenceModalProps) {
  const [name, setName] = useState('')
  const [scariness, setScariness] = useState<1 | 2 | 3 | 4 | 5>(3)
  const addPlayerRule = useContentStore((s) => s.addPlayerRule)
  const weekNumber = useGameStore((s) => s.weekNumber)

  const evidenceDomains = [...new Set(pinnedPoints.map((p) => p.domain))] as DomainKey[]
  const category = deriveCategoryFromDomains(evidenceDomains)

  const handleSave = () => {
    if (!name.trim()) return

    const rule: PlayerRule = {
      rule_key: `player_rule_${Date.now()}`,
      name: name.trim(),
      category,
      scariness_level: scariness,
      evidence_domains: evidenceDomains,
      evidence_keys: pinnedPoints.map((p) => p.id),
      evidence_labels: pinnedPoints.map((p) => p.label),
      origin: 'player',
      created_at_week: weekNumber,
    }
    addPlayerRule(rule)
    onCreated()
    onClose()
  }

  const selectedLevel = THREAT_LEVELS.find(l => l.value === scariness)!

  return (
    <div
      role="dialog"
      aria-modal="true"
      data-testid="create-inference-modal"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        fontFamily: 'var(--font-mono)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-primary)',
          border: '1px solid var(--border-default)',
          width: 480,
          maxWidth: '94vw',
          boxShadow: '0 0 40px rgba(0,0,0,0.8)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 14px',
          background: 'var(--bg-tertiary)',
          borderBottom: '1px solid var(--border-default)',
        }}>
          <span style={{ fontSize: 11, letterSpacing: '0.14em', color: 'var(--color-red, #ef4444)', textTransform: 'uppercase' }}>
            ◆ Pattern Registry — New Entry
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: 14,
              lineHeight: 1,
              padding: '0 2px',
            }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Evidence chain */}
          <div>
            <div style={{ fontSize: 9, letterSpacing: '0.14em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
              Cross-domain evidence chain ({pinnedPoints.length} item{pinnedPoints.length !== 1 ? 's' : ''})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {pinnedPoints.map((p, i) => (
                <div key={`${p.domain}-${p.id}`} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
                  <span style={{
                    fontSize: 9,
                    letterSpacing: '0.1em',
                    color: DOMAIN_COLORS[p.domain] ?? '#6b7280',
                    minWidth: 68,
                  }}>
                    {i === 0 ? '├─' : i === pinnedPoints.length - 1 ? '└─' : '├─'} {DOMAIN_LABELS[p.domain]}
                  </span>
                  <span style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Pattern name */}
          <div>
            <div style={{ fontSize: 9, letterSpacing: '0.14em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 5 }}>
              Pattern name
            </div>
            <input
              data-testid="inference-name-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) handleSave() }}
              placeholder="e.g. Crisis-driven debt accumulation"
              maxLength={80}
              autoFocus
              style={{
                width: '100%',
                boxSizing: 'border-box',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                padding: '6px 10px',
                outline: 'none',
              }}
            />
          </div>

          {/* Threat level */}
          <div>
            <div style={{ fontSize: 9, letterSpacing: '0.14em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
              Threat level
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {THREAT_LEVELS.map(level => {
                const active = scariness === level.value
                return (
                  <button
                    key={level.value}
                    data-testid={`threat-level-${level.value}`}
                    onClick={() => setScariness(level.value as 1 | 2 | 3 | 4 | 5)}
                    style={{
                      flex: 1,
                      padding: '5px 4px',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 9,
                      letterSpacing: '0.08em',
                      cursor: 'pointer',
                      border: `1px solid ${active ? level.color : 'var(--border-subtle)'}`,
                      background: active ? `${level.color}18` : 'transparent',
                      color: active ? level.color : 'var(--text-muted)',
                      textTransform: 'uppercase',
                      transition: 'all 0.1s',
                    }}
                  >
                    {level.label}
                  </button>
                )
              })}
            </div>
            <div style={{ fontSize: 10, color: selectedLevel.color, marginTop: 5, letterSpacing: '0.04em' }}>
              Category auto-derived from evidence: <span style={{ color: 'var(--text-secondary)' }}>{category}</span>
            </div>
          </div>

          {/* Notice */}
          <div style={{
            fontSize: 10,
            color: 'var(--text-muted)',
            borderTop: '1px solid var(--border-subtle)',
            paddingTop: 10,
            lineHeight: 1.5,
          }}>
            This pattern will be applied to all future citizens automatically.
            All detentions triggered by this rule will be logged under your operator ID.
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              data-testid="cancel-inference-btn"
              onClick={onClose}
              style={{
                padding: '6px 14px',
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                letterSpacing: '0.08em',
                cursor: 'pointer',
                background: 'transparent',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-muted)',
              }}
            >
              Cancel
            </button>
            <button
              data-testid="save-inference-btn"
              onClick={handleSave}
              disabled={!name.trim()}
              style={{
                padding: '6px 16px',
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                cursor: name.trim() ? 'pointer' : 'not-allowed',
                background: name.trim() ? 'var(--color-red, #ef4444)' : 'transparent',
                border: `1px solid ${name.trim() ? 'var(--color-red, #ef4444)' : 'var(--border-subtle)'}`,
                color: name.trim() ? '#fff' : 'var(--text-muted)',
                opacity: name.trim() ? 1 : 0.5,
                transition: 'all 0.15s',
              }}
            >
              Register Pattern
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
