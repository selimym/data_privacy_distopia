/**
 * TutorialOverlay — 4-step guided first shift overlaid on the live dashboard.
 * Dims the dashboard, spotlights the relevant panel with a green glow,
 * and streams each tip using the same AI aesthetic as the memo.
 */
import { useRef, useState, useEffect } from 'react'
import { useUIStore } from '@/stores/uiStore'
import { useContentStore } from '@/stores/contentStore'
import { useGameStore } from '@/stores/gameStore'
import { StreamingText } from '@/components/shared'
import type { StreamingTextHandle, TextSegment } from '@/components/shared'

type PanelTarget = 'left' | 'center' | 'right' | null

interface TutorialStep {
  panel: PanelTarget
  segments: TextSegment[]
}


const STEPS: TutorialStep[] = [
  {
    panel: 'left',
    segments: [
      { text: 'Your ' },
      { text: 'case queue is on the left.', style: { color: 'var(--text-primary)' } },
      { text: ' Each citizen has a risk score. Click any name to open their file.' },
    ],
  },
  {
    panel: 'center',
    segments: [
      { text: 'This is their ' },
      { text: 'data file.', style: { color: 'var(--text-primary)' } },
      { text: ' Use the tabs to review all available information. The Inference panel summarises the system\'s automated risk assessment.' },
    ],
  },
  {
    panel: 'center',
    segments: [
      { text: 'When ready, ' },
      { text: 'flag or clear the citizen', style: { color: 'var(--text-primary)' } },
      { text: ' using the buttons at the bottom. Take your time on your first case.' },
    ],
  },
  {
    panel: 'right',
    segments: [
      { text: 'This panel shows data about your activity. ' },
      { text: 'Standard administrative tracking — nothing to worry about for now.', style: { color: 'var(--text-placeholder)', fontStyle: 'italic' } },
    ],
  },
]

const DONE_SEGMENTS: TextSegment[] = [
  { text: 'Onboarding complete. Your first directive is loaded. Good luck, ' },
  { text: 'SYS-OP-001.', style: { color: 'var(--text-primary)' } },
]

export function TutorialOverlay() {
  const tutorialStep = useUIStore(s => s.tutorialStep)
  const advanceTutorial = useUIStore(s => s.advanceTutorial)
  const skipTutorial = useUIStore(s => s.skipTutorial)
  const setSelectedCitizen = useUIStore(s => s.setSelectedCitizen)
  const getFilteredCaseQueue = useGameStore(s => s.getFilteredCaseQueue)
  const unlockedDomains = useContentStore(s => s.unlockedDomains)

  const [tipReady, setTipReady] = useState(false)
  const [isDone, setIsDone] = useState(false)
  const streamRef = useRef<StreamingTextHandle>(null)

  // Reset ready state when step changes
  useEffect(() => {
    setTipReady(false)
    setIsDone(false)
  }, [tutorialStep])

  // Auto-select top-risk citizen when tutorial reaches the center panel
  useEffect(() => {
    if (tutorialStep !== 1) return
    const queue = getFilteredCaseQueue(unlockedDomains)
    const sorted = [...queue].sort((a, b) => {
      const aClassified = a.risk_level === 'classified' ? 1 : 0
      const bClassified = b.risk_level === 'classified' ? 1 : 0
      if (bClassified !== aClassified) return bClassified - aClassified
      return (b.risk_score ?? -1) - (a.risk_score ?? -1)
    })
    if (sorted.length > 0 && sorted[0] !== undefined) {
      setSelectedCitizen(sorted[0].citizen_id)
    }
  }, [tutorialStep, getFilteredCaseQueue, unlockedDomains, setSelectedCitizen])

  if (tutorialStep === null) return null

  const step = STEPS[tutorialStep]
  const panel = step?.panel ?? null
  const segments = isDone ? DONE_SEGMENTS : (step?.segments ?? DONE_SEGMENTS)

  function handleNext() {
    if (isDone) {
      skipTutorial()
      return
    }
    // If we're on the last step, show done message
    if (tutorialStep !== null && tutorialStep >= STEPS.length - 1) {
      setIsDone(true)
      setTipReady(false)
    } else {
      advanceTutorial()
    }
  }

  return (
    <>
      {/* Dim overlay — covers everything below z-index 10 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.72)',
          zIndex: 10,
          pointerEvents: 'none',
        }}
      />

      {/* Panel spotlight injector — elevates the target panel above the dim */}
      {panel && (
        <style>{`
          [data-tutorial-panel="${panel}"] {
            position: relative;
            z-index: 11;
            box-shadow: 0 0 0 2px var(--color-green), 0 0 20px 4px rgba(5, 150, 105, 0.2);
          }
        `}</style>
      )}

      {/* Tooltip card — bottom-center of dashboard */}
      <div
        data-testid="tutorial-overlay"
        style={{
          position: 'absolute',
          bottom: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 340,
          background: 'var(--bg-secondary)',
          border: '1px solid var(--color-green)',
          borderRadius: 6,
          padding: '16px 18px',
          zIndex: 20,
          boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
          fontFamily: 'var(--font-mono)',
        }}
      >
        {/* Source line */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            color: 'var(--color-green)',
            fontSize: 9,
            letterSpacing: '0.2em',
            marginBottom: 10,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'var(--color-green)',
              display: 'inline-block',
              animation: 'streaming-cursor-blink 1s infinite',
            }}
          />
          SYSTEM · ONBOARDING PROTOCOL
        </div>

        {/* Streaming tip */}
        <div
          style={{
            fontSize: 14,
            lineHeight: 1.8,
            color: 'var(--text-muted)',
            minHeight: 56,
          }}
        >
          <StreamingText
            ref={streamRef}
            segments={segments}
            speed={20}
            onComplete={() => setTipReady(true)}
          />
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 14,
          }}
        >
          <span style={{ color: 'var(--text-placeholder)', fontSize: 9 }}>
            {isDone ? '' : `${(tutorialStep ?? 0) + 1} / ${STEPS.length}`}
          </span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {!isDone && (tutorialStep ?? 0) >= 1 && (
              <button
                onClick={skipTutorial}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-placeholder)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  letterSpacing: '0.1em',
                  cursor: 'pointer',
                }}
              >
                SKIP
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={!tipReady}
              style={{
                background: 'transparent',
                border: '1px solid rgba(5, 150, 105, 0.3)',
                color: 'var(--color-green)',
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                letterSpacing: '0.12em',
                padding: '5px 14px',
                borderRadius: 2,
                cursor: tipReady ? 'pointer' : 'default',
                opacity: tipReady ? 1 : 0,
                transition: 'opacity 0.3s',
              }}
            >
              {isDone ? 'BEGIN SHIFT →' : 'UNDERSTOOD →'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
