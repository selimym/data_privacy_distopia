import { useState, useCallback, useEffect } from 'react'
import { useContentStore } from '@/stores/contentStore'
import { useUIStore } from '@/stores/uiStore'
import { Modal } from './Modal'
import type { InferenceRule } from '@/types/content'

interface RuleWithEnabled extends InferenceRule {
  enabled: boolean
}

function scarinessColor(level: number): string {
  if (level >= 5) return 'var(--color-red)'
  if (level >= 4) return 'var(--color-red)'
  if (level >= 3) return 'var(--color-amber)'
  if (level >= 2) return '#60a5fa'
  return 'var(--text-muted)'
}

function scarinessLabel(level: number): string {
  if (level >= 5) return 'CRITICAL'
  if (level >= 4) return 'HIGH'
  if (level >= 3) return 'MEDIUM'
  if (level >= 2) return 'LOW'
  return 'MINIMAL'
}

export function InferenceRulesEditor() {
  const modal = useUIStore(s => s.modal)
  const closeModal = useUIStore(s => s.closeModal)
  const inferenceRules = useContentStore(s => s.inferenceRules)

  const [localRules, setLocalRules] = useState<RuleWithEnabled[]>(() =>
    inferenceRules.map(r => ({ ...r, enabled: true }))
  )

  const isOpen = modal.type === 'inference_rules_editor'

  // Re-sync from store whenever the modal opens so newly added rules appear
  // immediately. localRules is intentionally NOT synced on every inferenceRules
  // change — only on open — to preserve the user's in-session toggles.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (isOpen) setLocalRules(inferenceRules.map(r => ({ ...r, enabled: true }))) }, [isOpen])

  const handleToggle = useCallback((ruleKey: string) => {
    setLocalRules(prev =>
      prev.map(r => r.rule_key === ruleKey ? { ...r, enabled: !r.enabled } : r)
    )
  }, [])

  const handleSave = useCallback(() => {
    // Save enabled rules back to contentStore (strip the `enabled` field)
    const enabledRules = localRules
      .filter(r => r.enabled)
      .map(({ enabled: _enabled, ...rest }): InferenceRule => rest)
    useContentStore.getState().updateInferenceRules(enabledRules)
    closeModal()
  }, [localRules, closeModal])

  const handleClose = useCallback(() => {
    // Reset local state to current store on cancel
    setLocalRules(inferenceRules.map(r => ({ ...r, enabled: true })))
    closeModal()
  }, [inferenceRules, closeModal])

  const enabledCount = localRules.filter(r => r.enabled).length

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="INFERENCE RULES EDITOR"
      data-testid="inference-rules-editor"
    >
      <div>
        {/* Summary bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12,
            padding: '6px 10px',
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 2,
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--text-muted)',
              letterSpacing: '0.06em',
            }}
          >
            {enabledCount} / {localRules.length} rules active
          </span>
          <button
            data-testid="inference-rules-save-btn"
            onClick={handleSave}
            style={{
              padding: '5px 14px',
              background: 'rgba(37, 99, 235, 0.15)',
              border: '1px solid var(--color-blue)',
              color: 'var(--color-blue)',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.1em',
              cursor: 'pointer',
              borderRadius: 2,
            }}
          >
            SAVE CHANGES
          </button>
        </div>

        {/* Rules list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {localRules.map(rule => (
            <div
              key={rule.rule_key}
              data-testid={`inference-rule-row-${rule.rule_key}`}
              style={{
                padding: '8px 10px',
                background: rule.enabled
                  ? 'rgba(255,255,255,0.03)'
                  : 'rgba(0,0,0,0.15)',
                border: `1px solid ${rule.enabled ? 'var(--border-subtle)' : 'rgba(255,255,255,0.04)'}`,
                borderRadius: 2,
                opacity: rule.enabled ? 1 : 0.5,
                transition: 'opacity 0.15s ease, background 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                {/* Toggle */}
                <button
                  data-testid={`inference-rule-toggle-${rule.rule_key}`}
                  onClick={() => handleToggle(rule.rule_key)}
                  aria-pressed={rule.enabled}
                  style={{
                    flexShrink: 0,
                    width: 32,
                    height: 16,
                    borderRadius: 8,
                    border: 'none',
                    background: rule.enabled ? 'var(--color-blue)' : 'rgba(255,255,255,0.12)',
                    cursor: 'pointer',
                    position: 'relative',
                    marginTop: 2,
                    transition: 'background 0.15s ease',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: 2,
                      left: rule.enabled ? 16 : 2,
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      background: '#fff',
                      transition: 'left 0.15s ease',
                    }}
                  />
                </button>

                {/* Rule info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginBottom: 2,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 11,
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {rule.name}
                    </span>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 9,
                        color: scarinessColor(rule.scariness_level),
                        letterSpacing: '0.08em',
                        flexShrink: 0,
                      }}
                    >
                      {scarinessLabel(rule.scariness_level)}
                    </span>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      gap: 12,
                      alignItems: 'center',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 9,
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                      }}
                    >
                      {rule.category}
                    </span>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 9,
                        color: 'var(--text-muted)',
                      }}
                    >
                      {rule.rule_key}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {localRules.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '24px',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--text-muted)',
            }}
          >
            No inference rules loaded.
          </div>
        )}
      </div>
    </Modal>
  )
}
