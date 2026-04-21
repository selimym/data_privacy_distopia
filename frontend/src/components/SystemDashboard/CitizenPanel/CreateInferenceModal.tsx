import { useState } from 'react'
import type { PinnedDataPoint, PlayerRule } from '../../../types/content'
import { useContentStore } from '../../../stores/contentStore'
import { useGameStore } from '../../../stores/gameStore'

interface CreateInferenceModalProps {
  pinnedPoints: PinnedDataPoint[]
  onClose: () => void
  onCreated: () => void
}

const CATEGORIES = ['behavioral', 'financial', 'health', 'political', 'social', 'location'] as const

export function CreateInferenceModal({ pinnedPoints, onClose, onCreated }: CreateInferenceModalProps) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState<string>('behavioral')
  const [scariness, setScariness] = useState<1 | 2 | 3 | 4 | 5>(3)
  const addPlayerRule = useContentStore((s) => s.addPlayerRule)
  const weekNumber = useGameStore((s) => s.weekNumber)

  const handleSave = () => {
    if (!name.trim()) return

    const rule: PlayerRule = {
      rule_key: `player_rule_${Date.now()}`,
      name: name.trim(),
      category,
      scariness_level: scariness,
      evidence_domains: [...new Set(pinnedPoints.map((p) => p.domain))],
      evidence_keys: pinnedPoints.map((p) => p.id),
      evidence_labels: pinnedPoints.map((p) => p.label),
      origin: 'player',
      created_at_week: weekNumber,
    }
    addPlayerRule(rule)
    onCreated()
    onClose()
  }

  return (
    <div role="dialog" aria-modal="true" data-testid="create-inference-modal">
      <h2>Create Inference Rule</h2>

      <section>
        <h3>Evidence ({pinnedPoints.length} items)</h3>
        <ul>
          {pinnedPoints.map((p) => (
            <li key={`${p.domain}-${p.id}`}>
              <strong>{p.domain}:</strong> {p.label}
            </li>
          ))}
        </ul>
      </section>

      <label>
        Rule name
        <input
          data-testid="inference-name-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Mental Health Crisis Risk"
          maxLength={80}
        />
      </label>

      <label>
        Category
        <select
          data-testid="inference-category-select"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </label>

      <label>
        Severity (1 = minimal, 5 = critical)
        <input
          data-testid="inference-scariness-input"
          type="range"
          min={1}
          max={5}
          value={scariness}
          onChange={(e) => setScariness(Number(e.target.value) as 1 | 2 | 3 | 4 | 5)}
        />
        <span>{scariness}</span>
      </label>

      <p>
        This pattern will be saved as a standing rule and applied automatically to future citizens.
      </p>

      <div>
        <button data-testid="cancel-inference-btn" onClick={onClose}>Cancel</button>
        <button
          data-testid="save-inference-btn"
          onClick={handleSave}
          disabled={!name.trim()}
        >
          Save rule
        </button>
      </div>
    </div>
  )
}
