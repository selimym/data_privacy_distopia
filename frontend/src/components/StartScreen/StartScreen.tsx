import React from 'react'
import { useTranslation } from 'react-i18next'
import { loadCountryProfile } from '@/services/ContentLoader'
import { initializeGame } from '@/services/GameOrchestrator'
import { useUIStore } from '@/stores/uiStore'
import { LoadingScreen } from '@/components/shared'
import { hasSeenAnyEnding } from '@/services/EndingsArchive'
import type { CountryProfile } from '@/types/content'
import { CountryCard } from './CountryCard'
import { LanguageSelector } from './LanguageSelector'

const COUNTRY_KEYS = ['usa', 'uk', 'france'] as const

export default function StartScreen() {
  const { t } = useTranslation()
  const setScreen = useUIStore((state) => state.setScreen)
  const tutorialComplete = useUIStore(s => s.tutorialComplete)
  const requestTutorial = useUIStore(s => s.requestTutorial)

  const [countries, setCountries] = React.useState<CountryProfile[]>([])
  const [replayTutorial, setReplayTutorial] = React.useState(false)
  const [loadingCountries, setLoadingCountries] = React.useState(true)
  const [selectedKey, setSelectedKey] = React.useState<string>('usa')
  const [starting, setStarting] = React.useState(false)
  const [startError, setStartError] = React.useState<string | null>(null)

  // Load all country profiles on mount
  React.useEffect(() => {
    let cancelled = false

    async function fetchCountries() {
      setLoadingCountries(true)
      try {
        const profiles = await Promise.all(
          COUNTRY_KEYS.map((key) => loadCountryProfile(key)),
        )
        if (!cancelled) {
          setCountries(profiles)
          setLoadingCountries(false)
        }
      } catch (err) {
        if (!cancelled) {
          setStartError(String(err))
          setLoadingCountries(false)
        }
      }
    }

    void fetchCountries()
    return () => {
      cancelled = true
    }
  }, [])

  async function handleBeginShift() {
    if (starting) return
    setStarting(true)
    setStartError(null)
    try {
      await initializeGame(selectedKey, 'SYS-OP-001')
      if (replayTutorial) requestTutorial()
      setScreen('dashboard')
    } catch (err) {
      setStartError(String(err))
      setStarting(false)
    }
  }

  if (loadingCountries) {
    return <LoadingScreen />
  }

  // ── Styles ──────────────────────────────────────────────────────────────────

  const outerStyle: React.CSSProperties = {
    position: 'relative',
    minHeight: '100vh',
    background: 'var(--bg-primary)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
  }

  // Scanline overlay via pseudo-element approach using a repeating-linear-gradient
  const scanlineOverlayStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    backgroundImage:
      'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.06) 2px, rgba(0,0,0,0.06) 4px)',
    pointerEvents: 'none',
    zIndex: 0,
  }

  const contentStyle: React.CSSProperties = {
    position: 'relative',
    zIndex: 1,
    width: '100%',
    maxWidth: '860px',
    padding: '48px 32px 40px',
    display: 'flex',
    flexDirection: 'column',
    gap: '40px',
  }

  // ── Header ──────────────────────────────────────────────────────────────────

  const headerStyle: React.CSSProperties = {
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-muted)',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  }

  const platformTitleStyle: React.CSSProperties = {
    fontSize: '18px',
    letterSpacing: '0.2em',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
  }

  const dividerStyle: React.CSSProperties = {
    fontSize: '13px',
    letterSpacing: '0.05em',
    color: 'var(--border-default)',
    margin: '4px 0',
  }

  const poweredByStyle: React.CSSProperties = {
    fontSize: '10px',
    letterSpacing: '0.18em',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
  }

  const onboardingStyle: React.CSSProperties = {
    fontSize: '10px',
    letterSpacing: '0.15em',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
  }

  // ── Middle ──────────────────────────────────────────────────────────────────

  const middleSectionStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  }

  const selectLabelStyle: React.CSSProperties = {
    fontFamily: 'var(--font-mono)',
    fontSize: '11px',
    letterSpacing: '0.12em',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
  }

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
  }

  const languageRowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'flex-end',
  }

  // ── Bottom ──────────────────────────────────────────────────────────────────

  const bottomStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
    paddingBottom: '48px',
  }

  const errorStyle: React.CSSProperties = {
    fontFamily: 'var(--font-mono)',
    fontSize: '10px',
    color: 'var(--color-red)',
    letterSpacing: '0.1em',
    textAlign: 'center',
    maxWidth: '400px',
  }

  const beginBtnStyle: React.CSSProperties = {
    background: starting ? 'var(--color-blue-dim)' : 'var(--color-blue)',
    color: '#ffffff',
    border: '1px solid var(--color-blue)',
    borderRadius: '3px',
    fontFamily: 'var(--font-mono)',
    fontSize: '13px',
    fontWeight: 700,
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    padding: '12px 48px',
    cursor: starting ? 'not-allowed' : 'pointer',
    opacity: starting ? 0.7 : 1,
    transition: 'background 0.15s, opacity 0.15s',
  }

  return (
    <div style={outerStyle} data-testid="start-screen">
      {/* Scanline overlay */}
      <div style={scanlineOverlayStyle} aria-hidden="true" />

      <div style={contentStyle}>
        {/* ── TOP: Header ─────────────────────────────────────────────────── */}
        <header style={headerStyle}>
          <div style={platformTitleStyle}>
            {t('start.headline')} {t('app.version')}
          </div>
          <div style={dividerStyle}>
            {'━'.repeat(48)}
          </div>
          <div style={poweredByStyle}>INTELLIGENCE ANALYTICS PLATFORM v2.1</div>
          <div style={onboardingStyle}>{t('start.subtitle')}</div>
        </header>

        {/* ── MIDDLE: Country selection ────────────────────────────────────── */}
        <section style={middleSectionStyle}>
          <div style={selectLabelStyle}>{t('start.select_country')}</div>
          <div style={gridStyle}>
            {countries.map((country) => (
              <CountryCard
                key={country.country_key}
                country={country}
                isSelected={selectedKey === country.country_key}
                onSelect={() => setSelectedKey(country.country_key)}
              />
            ))}
          </div>
          <div style={languageRowStyle}>
            <LanguageSelector />
          </div>
        </section>

        {/* ── BOTTOM: Begin shift ──────────────────────────────────────────── */}
        <div style={bottomStyle}>
          {startError !== null && (
            <div style={errorStyle}>{startError}</div>
          )}
          <button
            style={beginBtnStyle}
            data-testid="begin-shift-btn"
            onClick={() => void handleBeginShift()}
            disabled={starting}
            type="button"
          >
            {starting ? t('common.loading') : t('start.begin_shift')}
          </button>
          {tutorialComplete && (
            <button
              data-testid="replay-tutorial-btn"
              type="button"
              onClick={() => setReplayTutorial(r => !r)}
              style={{
                marginTop: 8,
                background: 'transparent',
                border: `1px solid ${replayTutorial ? 'rgba(5, 150, 105, 0.5)' : 'rgba(255,255,255,0.15)'}`,
                color: replayTutorial ? 'var(--color-green)' : '#6b7280',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                letterSpacing: '0.15em',
                textTransform: 'uppercase' as const,
                padding: '10px 28px',
                cursor: 'pointer',
                borderRadius: 2,
                transition: 'border-color 0.15s, color 0.15s',
                display: 'block',
                width: '100%',
              }}
            >
              {replayTutorial ? '✓ REPLAY ONBOARDING' : 'REPLAY ONBOARDING'}
            </button>
          )}
          {hasSeenAnyEnding() && (
            <button
              data-testid="open-archive-btn"
              onClick={() => setScreen('endings_archive')}
              type="button"
              style={{
                marginTop: 12,
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#6b7280',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                padding: '10px 28px',
                cursor: 'pointer',
                borderRadius: 2,
                transition: 'border-color 0.15s, color 0.15s',
                display: 'block',
                width: '100%',
              }}
              onMouseEnter={e => {
                ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.35)'
                ;(e.currentTarget as HTMLButtonElement).style.color = '#9ca3af'
              }}
              onMouseLeave={e => {
                ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.15)'
                ;(e.currentTarget as HTMLButtonElement).style.color = '#6b7280'
              }}
            >
              ◆ {t('archive.title').split('—')[1]?.trim() ?? 'Endings Archive'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
