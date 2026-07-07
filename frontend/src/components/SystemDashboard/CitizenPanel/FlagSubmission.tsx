import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { FlagType } from '@/types/game'
import type { InferenceResult } from '@/types/citizen'
import { useGameStore } from '@/stores/gameStore'
import { useContentStore } from '@/stores/contentStore'

interface FlagSubmissionProps {
  citizenId: string
  isVisible: boolean
  inferenceResults: InferenceResult[]
}

const FLAG_TYPES: FlagType[] = ['monitoring', 'restriction', 'intervention', 'detention']

export function FlagSubmission({ citizenId, isVisible, inferenceResults }: FlagSubmissionProps) {
  const { t } = useTranslation()
  const [selectedType, setSelectedType] = useState<FlagType | null>(null)

  const submitFlag = useGameStore(s => s.submitFlag)
  const submitNoAction = useGameStore(s => s.submitNoAction)
  const country = useContentStore(s => s.country)

  // Reset form when citizen changes
  useEffect(() => {
    setSelectedType(null)
  }, [citizenId])

  if (!isVisible) return null

  const canSubmit = selectedType !== null

  const handleSubmit = () => {
    if (!canSubmit || selectedType === null) return
    const findings = inferenceResults.map(r => r.rule_key)
    const justification = findings.join(', ')
    submitFlag(citizenId, selectedType, justification, findings, inferenceResults)
    setSelectedType(null)
  }

  const handleNoAction = () => {
    submitNoAction(citizenId)
  }

  return (
    <div
      style={{
        borderTop: '1px solid var(--border-subtle)',
        padding: '10px 12px 12px',
        background: 'var(--bg-secondary)',
      }}
    >
      {/* Flag type selection — horizontal chips */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
          {t('flag.submission.select_type')}
        </div>
        <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
          {FLAG_TYPES.map(type => (
            <label
              key={type}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer',
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                color: selectedType === type ? 'var(--color-amber)' : 'var(--text-secondary)',
                padding: '4px 9px',
                background: selectedType === type ? 'var(--bg-surface)' : 'transparent',
                border: `1px solid ${selectedType === type ? 'var(--color-amber)' : 'var(--border-subtle)'}`,
                borderRadius: 2,
              }}
            >
              <input
                type="radio"
                name={`flag-type-${citizenId}`}
                value={type}
                checked={selectedType === type}
                onChange={() => setSelectedType(type)}
                data-testid={`flag-type-${type}`}
                style={{ accentColor: 'var(--color-amber)', width: 12, height: 12 }}
              />
              {country?.ui_flavor.flag_labels[type] ?? t(`flag.type.${type}`)}
            </label>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          data-testid="submit-flag-btn"
          onClick={handleSubmit}
          disabled={!canSubmit}
          style={{
            flex: 1,
            padding: '8px 14px',
            fontFamily: 'var(--font-mono)',
            fontSize: 13,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            background: canSubmit ? 'var(--color-red-dim)' : 'var(--bg-tertiary)',
            color: canSubmit ? 'var(--color-red)' : 'var(--text-disabled)',
            border: `1px solid ${canSubmit ? 'var(--color-red)' : 'var(--border-subtle)'}`,
            cursor: canSubmit ? 'pointer' : 'not-allowed',
            borderRadius: 2,
          }}
        >
          {t('flag.submission.submit')}
        </button>

        <button
          data-testid="no-action-btn"
          onClick={handleNoAction}
          style={{
            flex: 1,
            padding: '8px 14px',
            fontFamily: 'var(--font-mono)',
            fontSize: 13,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            background: 'transparent',
            color: 'var(--text-muted)',
            border: '1px solid var(--border-subtle)',
            cursor: 'pointer',
            borderRadius: 2,
          }}
        >
          {t('flag.submission.no_action')}
        </button>
      </div>
    </div>
  )
}
