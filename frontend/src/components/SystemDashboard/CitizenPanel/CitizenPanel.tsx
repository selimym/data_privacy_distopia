import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useUIStore } from '@/stores/uiStore'
import { useCitizenStore } from '@/stores/citizenStore'
import { useContentStore } from '@/stores/contentStore'
import { useGameStore } from '@/stores/gameStore'
import { InferenceEngine } from '@/services/InferenceEngine'
import { calculateRiskScore } from '@/services/RiskScorer'
import type { CitizenProfile } from '@/types/citizen'
import type { InferenceResult } from '@/types/citizen'
import type { DomainKey } from '@/types/game'
import type { PinnedDataPoint } from '@/types/content'
import { DataDomainTabs } from './DataDomainTabs'
import { InferencePanel } from './InferencePanel'
import { FlagSubmission } from './FlagSubmission'
import { AutoFlagDecisionPanel } from './AutoFlagDecisionPanel'
import { CreateInferenceModal } from './CreateInferenceModal'

export function CitizenPanel() {
  const { t } = useTranslation()

  const selectedCitizenId = useUIStore(s => s.selectedCitizenId)
  const tutorialStep = useUIStore(s => s.tutorialStep)
  const startDecisionTimer = useUIStore(s => s.startDecisionTimer)
  const getProfile = useCitizenStore(s => s.getProfile)
  const dataBanks = useContentStore(s => s.dataBanks)
  const country = useContentStore(s => s.country)
  const inferenceRules = useContentStore(s => s.inferenceRules)
  const unlockedDomains = useContentStore(s => s.unlockedDomains)
  const pendingBotDecisions = useGameStore(s => s.pendingBotDecisions)
  const triggerEpsteinEnding = useGameStore(s => s.triggerEpsteinEnding)

  const [profile, setProfile] = useState<CitizenProfile | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [inferenceResults, setInferenceResults] = useState<InferenceResult[]>([])
  const [activeTab, setActiveTab] = useState<DomainKey | 'identity'>('identity')
  const [visitedTabs, setVisitedTabs] = useState<Set<DomainKey>>(new Set())
  const [pinnedPoints, setPinnedPoints] = useState<PinnedDataPoint[]>([])
  const [showCreateInference, setShowCreateInference] = useState(false)
  const epsteinEndingTriggered = useRef(false)

  useEffect(() => {
    if (!selectedCitizenId || !dataBanks || !country) {
      setProfile(null)
      setInferenceResults([])
      return
    }

    let cancelled = false
    setIsLoading(true)
    setProfile(null)
    setInferenceResults([])
    setActiveTab('identity')
    setVisitedTabs(new Set())
    epsteinEndingTriggered.current = false

    if (tutorialStep === null) startDecisionTimer()

    getProfile(selectedCitizenId, dataBanks, country)
      .then(loadedProfile => {
        if (cancelled) return
        setProfile(loadedProfile)

        // Run inference engine
        const engine = new InferenceEngine(inferenceRules)
        const unlockedSet = new Set(unlockedDomains as DomainKey[])
        const results = engine.evaluate(loadedProfile, unlockedSet, country)
        setInferenceResults(results)

        // Run risk scoring and update cache
        const riskAssessment = calculateRiskScore(loadedProfile, results, unlockedSet)
        useCitizenStore.getState().updateSkeletonCache(selectedCitizenId, riskAssessment.score)
      })
      .catch(() => {
        if (!cancelled) {
          setProfile(null)
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [selectedCitizenId, dataBanks, country, inferenceRules, unlockedDomains, getProfile, startDecisionTimer])

  // Reset pins when the selected citizen changes
  useEffect(() => {
    setPinnedPoints([])
    setShowCreateInference(false)
  }, [selectedCitizenId])

  const handlePin = (point: PinnedDataPoint) => {
    setPinnedPoints((prev) => {
      const exists = prev.find((p) => p.id === point.id && p.domain === point.domain)
      if (exists) return prev.filter((p) => !(p.id === point.id && p.domain === point.domain))
      return [...prev, point]
    })
  }

  const handleClearPins = () => setPinnedPoints([])

  const uniquePinnedDomains = new Set(pinnedPoints.map((p) => p.domain))
  const canConnect = pinnedPoints.length >= 2 && uniquePinnedDomains.size >= 2

  const hasBotDecision = selectedCitizenId !== null &&
    pendingBotDecisions.some(d => d.citizen_id === selectedCitizenId)

  if (!selectedCitizenId) {
    return (
      <div
        data-testid="citizen-panel"
        className="panel"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            color: 'var(--text-muted)',
            letterSpacing: '0.05em',
            textAlign: 'center',
          }}
        >
          {t('citizen.panel.no_selection')}
        </div>
      </div>
    )
  }

  return (
    <div data-testid="citizen-panel" className="panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Panel title */}
      <div className="panel-title" style={{ marginBottom: 8, flexShrink: 0 }}>
        {t('citizen.panel.title')}
        {selectedCitizenId && (
          <span
            style={{
              marginLeft: 8,
              fontSize: 9,
              color: 'var(--text-muted)',
              letterSpacing: '0.06em',
            }}
          >
            {t('citizen.panel.case_id')}: {selectedCitizenId.slice(0, 8).toUpperCase()}
          </span>
        )}
      </div>

      {isLoading && (
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--text-muted)',
            padding: '16px 0',
            textAlign: 'center',
            flexShrink: 0,
          }}
        >
          {t('common.loading')}
        </div>
      )}

      {!isLoading && profile && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>

          {/* TOP ZONE — fills remaining space above inference panel, scrollable */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <DataDomainTabs
              profile={profile}
              unlockedDomains={unlockedDomains}
              activeTab={activeTab}
              pinnedPoints={pinnedPoints}
              onPin={handlePin}
              onTabChange={(tab) => {
                setActiveTab(tab)
                if (tab !== 'identity') {
                  setVisitedTabs(prev => {
                    const next = new Set(prev)
                    next.add(tab)
                    if (
                      !epsteinEndingTriggered.current &&
                      profile.scenario_key === 'protected_citizen' &&
                      unlockedDomains.length > 0 &&
                      unlockedDomains.every(d => d === tab || next.has(d))
                    ) {
                      epsteinEndingTriggered.current = true
                      setTimeout(() => triggerEpsteinEnding(), 2000)
                    }
                    return next
                  })
                }
              }}
            />
          </div>

          {/* Pin connect bar */}
          {canConnect && (
            <div style={{ flexShrink: 0, padding: '6px 12px', background: 'var(--bg-surface)', borderTop: '1px solid var(--border-subtle)' }}>
              <button
                data-testid="connect-evidence-btn"
                onClick={() => setShowCreateInference(true)}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  letterSpacing: '0.06em',
                  cursor: 'pointer',
                  background: 'var(--color-amber)',
                  color: 'var(--bg-primary)',
                  border: 'none',
                  padding: '4px 10px',
                }}
              >
                Connect {pinnedPoints.length} items → create inference
              </button>
              <button
                data-testid="clear-pins-btn"
                onClick={handleClearPins}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  letterSpacing: '0.06em',
                  cursor: 'pointer',
                  background: 'transparent',
                  color: 'var(--text-muted)',
                  border: '1px solid var(--border-subtle)',
                  padding: '4px 8px',
                  marginLeft: 8,
                }}
              >
                Clear pins
              </button>
            </div>
          )}
          {showCreateInference && (
            <CreateInferenceModal
              pinnedPoints={pinnedPoints}
              onClose={() => setShowCreateInference(false)}
              onCreated={handleClearPins}
            />
          )}

          {/* Divider */}
          <div style={{ height: 2, background: 'var(--border-default)', flexShrink: 0 }} />

          {/* BOTTOM ZONE — pinned bottom, grows upward when rows expand (max 55% of panel) */}
          <div style={{ flexShrink: 0, maxHeight: '55%', display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)' }}>
            <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
              {hasBotDecision
                ? <AutoFlagDecisionPanel citizenId={selectedCitizenId} />
                : (
                  <InferencePanel
                    results={inferenceResults}
                    isLoading={false}
                    visitedTabs={visitedTabs}
                    unlockedDomains={unlockedDomains as import('@/types/game').DomainKey[]}
                    isProtectedCitizen={profile.scenario_key === 'protected_citizen'}
                  />
                )
              }
            </div>
            {!hasBotDecision && (
              <div style={{ flexShrink: 0 }}>
                <FlagSubmission
                  citizenId={selectedCitizenId}
                  isVisible={true}
                  inferenceResults={inferenceResults}
                />
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  )
}
