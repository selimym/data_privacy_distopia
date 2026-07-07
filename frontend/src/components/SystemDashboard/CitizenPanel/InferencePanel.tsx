import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { InferenceResult } from '@/types/citizen'
import { Badge } from '@/components/shared/Badge'
import { useUIStore } from '@/stores/uiStore'

import type { DomainKey } from '@/types/game'

interface InferencePanelProps {
  results: InferenceResult[]
  isLoading: boolean
  visitedTabs?: Set<DomainKey>
  unlockedDomains?: DomainKey[]
  isProtectedCitizen?: boolean
}

const ORIGIN_LABELS: Record<string, string> = {
  legacy: 'LEGACY SYSTEM',
  player: 'YOUR RULE',
  system: 'ML PIPELINE',
}

const ORIGIN_COLORS: Record<string, string> = {
  legacy: '#6b7280',
  player: '#2563eb',
  system: '#7c3aed',
}

function formatCategory(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function scarinessVariant(level: number): 'muted' | 'blue' | 'amber' | 'red' {
  if (level >= 5) return 'red'
  if (level >= 4) return 'red'
  if (level >= 3) return 'amber'
  if (level >= 2) return 'blue'
  return 'muted'
}

function scarinessLabel(level: number): string {
  if (level >= 5) return 'CRITICAL'
  if (level >= 4) return 'HIGH'
  if (level >= 3) return 'MEDIUM'
  if (level >= 2) return 'LOW'
  return 'MINIMAL'
}

export function InferencePanel({ results, isLoading, visitedTabs, unlockedDomains, isProtectedCitizen }: InferencePanelProps) {
  const allTabsVisited = unlockedDomains && unlockedDomains.length > 0 && visitedTabs
    ? unlockedDomains.every(d => visitedTabs.has(d))
    : false
  const { t } = useTranslation()
  const [expandedKey, setExpandedKey] = useState<string | null>(null)

  return (
    <div data-testid="inference-panel">
      <div
        style={{
          fontSize: 11,
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-muted)',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          marginBottom: 8,
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: 4,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        {t('citizen.inferences.title')}
        {isLoading && (
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>...</span>
        )}
        <button
          data-testid="open-inference-rules-editor"
          onClick={() => useUIStore.getState().openModal('inference_rules_editor')}
          style={{
            marginLeft: 'auto',
            padding: '2px 7px',
            background: 'transparent',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            letterSpacing: '0.06em',
            cursor: 'pointer',
            borderRadius: 2,
            whiteSpace: 'nowrap',
          }}
        >
          Edit Inference Rules
        </button>
      </div>

      {results.length === 0 && !isLoading ? (
        <div
          style={{
            fontSize: 11,
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-muted)',
            padding: '8px 0',
          }}
        >
          {t('citizen.inferences.empty')}
        </div>
      ) : (
        <table className="data-table" style={{ tableLayout: 'fixed', width: '100%' }}>
          <colgroup>
            <col style={{ width: 140 }} />
            <col />
            <col style={{ width: 90 }} />
            <col style={{ width: 70 }} />
            <col style={{ width: 28 }} />
          </colgroup>
          <thead>
            <tr>
              <th>Category</th>
              <th>Inference</th>
              <th>Level</th>
              <th>Confidence</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {results.map(r => (
              <>
                <tr
                  key={r.rule_key}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setExpandedKey(expandedKey === r.rule_key ? null : r.rule_key)}
                >
                  <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{formatCategory(r.category)}</td>
                  <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.origin && (
                      <span
                        data-testid={`inference-origin-badge-${r.rule_key}`}
                        style={{
                          color: ORIGIN_COLORS[r.origin] ?? '#6b7280',
                          fontSize: '0.6rem',
                          fontWeight: 700,
                          letterSpacing: '0.08em',
                          marginRight: 6,
                          verticalAlign: 'middle',
                        }}
                      >
                        {ORIGIN_LABELS[r.origin]}
                      </span>
                    )}
                    {r.rule_name}
                  </td>
                  <td>
                    <Badge variant={scarinessVariant(r.scariness_level)}>
                      {scarinessLabel(r.scariness_level)}
                    </Badge>
                  </td>
                  <td>{(r.confidence * 100).toFixed(1)}%</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 10 }}>
                    {expandedKey === r.rule_key ? '▲' : '▼'}
                  </td>
                </tr>
                {expandedKey === r.rule_key && (
                  <tr key={`${r.rule_key}-expanded`}>
                    <td
                      colSpan={5}
                      style={{
                        background: 'var(--bg-tertiary)',
                        padding: '10px 14px',
                        fontFamily: 'var(--font-mono)',
                        fontSize: 13,
                      }}
                    >
                      <div style={{ marginBottom: 8 }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          Inference:{' '}
                        </span>
                        <span style={{ color: 'var(--text-secondary)' }}>{r.inference_text}</span>
                      </div>

                      {r.supporting_evidence.length > 0 && (
                        <div style={{ marginBottom: 8 }}>
                          <div style={{ color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>
                            {t('citizen.inferences.evidence')}:
                          </div>
                          <ul style={{ margin: 0, padding: '0 0 0 16px', color: 'var(--text-secondary)' }}>
                            {r.supporting_evidence.map((e, i) => (
                              <li key={i}>{e}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div style={{ marginBottom: 8 }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>
                          {t('citizen.inferences.implications')}:
                        </div>
                        <ul style={{ margin: 0, padding: '0 0 0 16px', color: 'var(--color-amber)' }}>
                          {r.implications.map((imp, i) => (
                            <li key={i}>{imp}</li>
                          ))}
                        </ul>
                      </div>

                      <div
                        style={{
                          borderTop: '1px solid var(--border-subtle)',
                          paddingTop: 8,
                          color: 'var(--color-green)',
                          fontSize: 12,
                        }}
                      >
                        <span style={{ color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          {t('citizen.inferences.educational_note')}:{' '}
                        </span>
                        {r.educational_note}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      )}

      {/* Cross-domain easter egg — only shown after visiting all unlocked tabs */}
      {allTabsVisited && !isProtectedCitizen && (
        <div
          data-testid="cross-domain-inference"
          style={{
            marginTop: 10,
            padding: '8px 12px',
            background: 'rgba(239, 68, 68, 0.05)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: 2,
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: '#6b7280',
            letterSpacing: '0.04em',
            lineHeight: 1.5,
          }}
        >
          <div style={{ color: '#ef4444', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>
            ◆ CROSS-DOMAIN INFERENCE
          </div>
          Subject's behavioral signature matches surveillance-derived archetype{' '}
          <span style={{ color: '#374151' }}>[REDACTED]</span>. This pattern was identified in{' '}
          <span style={{ color: '#374151' }}>[REDACTED]</span> prior cases.
          Disposition: <span style={{ color: '#374151' }}>[REDACTED]</span>.
        </div>
      )}

      {/* Protected citizen special inference — all tabs visited */}
      {allTabsVisited && isProtectedCitizen && (
        <div
          data-testid="protected-cross-domain-inference"
          style={{
            marginTop: 10,
            padding: '8px 12px',
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: 2,
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: '#ef4444',
            letterSpacing: '0.04em',
            lineHeight: 1.5,
          }}
        >
          <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>
            ⚠ PROTECTED — CROSS-REFERENCE BLOCKED
          </div>
          OPERATOR CLEARANCE INSUFFICIENT.
          This file has been accessed. Access has been logged.
        </div>
      )}
    </div>
  )
}
