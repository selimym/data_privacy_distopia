import { useTranslation } from 'react-i18next'
import type { CitizenProfile } from '@/types/citizen'
import type { DomainKey } from '@/types/game'
import type { PinnedDataPoint } from '@/types/content'
import { useContentStore } from '@/stores/contentStore'
import { useUIStore } from '@/stores/uiStore'
import { HealthTab } from './HealthTab'
import { FinanceTab } from './FinanceTab'
import { JudicialTab } from './JudicialTab'
import { LocationTab } from './LocationTab'
import { SocialTab } from './SocialTab'
import { MessagesTab } from './MessagesTab'
import { IdentitySection } from './IdentitySection'

interface DataDomainTabsProps {
  profile: CitizenProfile
  unlockedDomains: DomainKey[]
  activeTab: DomainKey | 'identity'
  onTabChange: (tab: DomainKey | 'identity') => void
  pinnedPoints: PinnedDataPoint[]
  onPin: (point: PinnedDataPoint) => void
}

const ALL_DOMAINS: DomainKey[] = ['health', 'finance', 'judicial', 'location', 'social', 'messages']

export function DataDomainTabs({ profile, unlockedDomains, activeTab, onTabChange, pinnedPoints, onPin }: DataDomainTabsProps) {
  const { t } = useTranslation()
  const country = useContentStore((s) => s.country)
  const newlyUnlockedDomains = useUIStore(s => s.newlyUnlockedDomains)
  const markDomainVisited = useUIStore(s => s.markDomainVisited)

  const tabButtonStyle = (isActive: boolean, isLocked: boolean): React.CSSProperties => ({
    padding: '5px 11px',
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    cursor: isLocked ? 'not-allowed' : 'pointer',
    border: 'none',
    borderBottom: isActive ? '2px solid var(--color-amber)' : '2px solid transparent',
    background: isActive ? 'var(--bg-surface)' : 'transparent',
    color: isLocked ? 'var(--text-disabled)' : isActive ? 'var(--color-amber)' : 'var(--text-muted)',
    whiteSpace: 'nowrap',
    opacity: isLocked ? 0.5 : 1,
  })

  return (
    <div data-testid="domain-tabs">
      <div
        style={{
          display: 'flex',
          gap: 0,
          borderBottom: '1px solid var(--border-subtle)',
          marginBottom: 12,
          overflowX: 'auto',
        }}
      >
        {/* Identity tab — always visible */}
        <button
          data-testid="tab-identity"
          style={tabButtonStyle(activeTab === 'identity', false)}
          onClick={() => onTabChange('identity')}
        >
          Identity
        </button>

        {ALL_DOMAINS.map(domain => {
          const isUnlocked = unlockedDomains.includes(domain)
          // If country defines available_domains, domains NOT in that list are regionally unavailable
          const isRegionallyAvailable = country === null
            || country.available_domains.includes(domain)
          const isEffectivelyLocked = !isUnlocked
          const isNew = newlyUnlockedDomains.includes(domain)
          const tooltipText = !isRegionallyAvailable
            ? 'NOT AVAILABLE IN THIS REGION'
            : !isUnlocked ? t('citizen.domains.locked') : undefined
          return (
            <button
              key={domain}
              data-testid={`tab-${domain}`}
              style={{ ...tabButtonStyle(activeTab === domain, isEffectivelyLocked), position: 'relative' }}
              onClick={() => {
                if (!isUnlocked) return
                onTabChange(domain)
                if (isNew) markDomainVisited(domain)
              }}
              title={tooltipText}
            >
              {isUnlocked
                ? t(`citizen.domains.${domain}`)
                : !isRegionallyAvailable
                  ? `— ${t(`citizen.domains.${domain}`)}`
                  : `🔒 ${t(`citizen.domains.${domain}`)}`}
              {isNew && (
                <span
                  data-testid={`domain-new-badge-${domain}`}
                  style={{
                    position: 'absolute',
                    top: 1,
                    right: 2,
                    fontFamily: 'var(--font-mono)',
                    fontSize: 7,
                    color: 'var(--color-green)',
                    letterSpacing: '0.05em',
                    lineHeight: 1,
                  }}
                >
                  NEW
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div style={{ minHeight: 120 }}>
        {activeTab === 'identity' && (
          <IdentitySection skeleton={profile} />
        )}
        {activeTab === 'health' && profile.health && (
          <HealthTab
            health={profile.health}
            onPin={onPin}
            pinnedIds={pinnedPoints.filter((p) => p.domain === 'health').map((p) => p.id)}
          />
        )}
        {activeTab === 'finance' && profile.finance && (
          <FinanceTab
            finance={profile.finance}
            onPin={onPin}
            pinnedIds={pinnedPoints.filter((p) => p.domain === 'finance').map((p) => p.id)}
          />
        )}
        {activeTab === 'judicial' && profile.judicial && (
          <JudicialTab
            judicial={profile.judicial}
            onPin={onPin}
            pinnedIds={pinnedPoints.filter((p) => p.domain === 'judicial').map((p) => p.id)}
          />
        )}
        {activeTab === 'location' && profile.location && (
          <LocationTab
            location={profile.location}
            onPin={onPin}
            pinnedIds={pinnedPoints.filter((p) => p.domain === 'location').map((p) => p.id)}
          />
        )}
        {activeTab === 'social' && profile.social && (
          <SocialTab
            social={profile.social}
            onPin={onPin}
            pinnedIds={pinnedPoints.filter((p) => p.domain === 'social').map((p) => p.id)}
          />
        )}
        {activeTab === 'messages' && profile.messages && (
          <MessagesTab
            messages={profile.messages}
            onPin={onPin}
            pinnedIds={pinnedPoints.filter((p) => p.domain === 'messages').map((p) => p.id)}
          />
        )}
      </div>
    </div>
  )
}
