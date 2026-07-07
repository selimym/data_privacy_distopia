/**
 * uiStore — UI state: screen routing, selected citizen, cinematic queue,
 * notifications, modals, and the decision timer.
 */
import { create } from 'zustand'
import type { Screen, Notification, NotificationType, CinematicData, ModalState, ModalType, ShiftMemoData } from '@/types/ui'

export type DashboardView = 'case-review' | 'news-feed' | 'world-map'

interface UIState {
  // Screen
  currentScreen: Screen
  previousScreen: Screen | null
  setScreen: (screen: Screen) => void
  goBack: () => void

  // Dashboard view (case-review | news-feed | world-map)
  currentView: DashboardView
  setView: (view: DashboardView) => void

  // First-run memo — persisted in localStorage
  memoAcknowledged: boolean
  acknowledgeMemo: () => void

  // Guided first-shift tutorial (null = done/skipped)
  tutorialStep: number | null
  advanceTutorial: () => void
  skipTutorial: () => void

  // Tutorial completion tracking — persisted in localStorage
  tutorialComplete: boolean
  requestTutorial: () => void

  // In-memory flag: set from StartScreen to force tutorial replay
  tutorialRequested: boolean

  // Queue collapse state
  queueCollapsed: boolean
  toggleQueue: () => void

  // Selected citizen (case panel)
  selectedCitizenId: string | null
  setSelectedCitizen: (id: string | null) => void

  // Cinematic queue
  cinematicQueue: CinematicData[]
  currentCinematic: CinematicData | null
  enqueueCinematic: (cinematic: CinematicData) => void
  advanceCinematic: () => void
  skipCinematic: () => void

  // Notifications
  notifications: Notification[]
  addNotification: (type: NotificationType, title: string, message: string, opts?: { auto_dismiss_ms?: number | null; data?: Record<string, unknown> }) => void
  dismissNotification: (id: string) => void
  clearNotifications: () => void

  // Modals
  modal: ModalState
  openModal: (type: ModalType, data?: Record<string, unknown>) => void
  closeModal: () => void

  // Decision timer (tracks time since citizen was opened — internal only, not displayed)
  decisionTimerStart: number | null
  startDecisionTimer: () => void
  getDecisionElapsedSecs: () => number

  // Global shift timer (displayed to player)
  shiftStartTime: number | null
  startShiftTimer: () => void
  getShiftElapsedSecs: () => number

  // Shift memo (shown between weeks)
  pendingShiftMemo: ShiftMemoData | null
  showShiftMemo: (data: ShiftMemoData) => void
  dismissShiftMemo: () => void

  // Memo history — all shift memos shown this run (for archive)
  memoHistory: ShiftMemoData[]

  // News unread tracking
  lastNewsViewedAt: string | null

  // Briefing suppression — set after end-of-shift memo already shows next briefing
  suppressBriefingForKey: string | null
  setSuppressBriefingForKey: (key: string | null) => void

  // Newly unlocked domains (show NEW badge until visited)
  newlyUnlockedDomains: import('@/types/game').DomainKey[]
  markDomainVisited: (domain: import('@/types/game').DomainKey) => void
  addNewlyUnlockedDomains: (domains: import('@/types/game').DomainKey[]) => void

  // Reset
  reset: () => void
}

const MEMO_KEY = 'civic-harmony-memo-acknowledged'
const TUTORIAL_KEY = 'civic-harmony-tutorial-complete'

const initialState = {
  currentScreen: 'start' as Screen,
  previousScreen: null as Screen | null,
  currentView: 'case-review' as DashboardView,
  memoAcknowledged: false,
  tutorialStep: null as number | null,
  tutorialComplete: localStorage.getItem(TUTORIAL_KEY) === 'true',
  tutorialRequested: false,
  queueCollapsed: false,
  selectedCitizenId: null as string | null,
  cinematicQueue: [] as CinematicData[],
  currentCinematic: null as CinematicData | null,
  notifications: [] as Notification[],
  modal: { type: null } as ModalState,
  decisionTimerStart: null as number | null,
  shiftStartTime: null as number | null,
  pendingShiftMemo: null as ShiftMemoData | null,
  memoHistory: [] as ShiftMemoData[],
  lastNewsViewedAt: null as string | null,
  suppressBriefingForKey: null as string | null,
  newlyUnlockedDomains: [] as import('@/types/game').DomainKey[],
}

export const useUIStore = create<UIState>((set, get) => ({
  ...initialState,

  setScreen: (screen) => set(state => ({ currentScreen: screen, previousScreen: state.currentScreen })),

  goBack: () => set(state => ({
    currentScreen: state.previousScreen ?? 'start',
    previousScreen: null,
  })),

  setView: (view) => {
    set({ currentView: view })
    if (view === 'news-feed') {
      set({ lastNewsViewedAt: new Date().toISOString() })
    }
  },

  acknowledgeMemo: () => {
    localStorage.setItem(MEMO_KEY, 'true')
    const { tutorialComplete, tutorialRequested } = get()
    const startTutorial = !tutorialComplete || tutorialRequested
    set({ memoAcknowledged: true, tutorialStep: startTutorial ? 0 : null, tutorialRequested: false })
  },

  advanceTutorial: () => {
    const { tutorialStep } = get()
    if (tutorialStep === null) return
    const next = tutorialStep + 1
    set({ tutorialStep: next > 4 ? null : next })
  },

  skipTutorial: () => {
    localStorage.setItem(TUTORIAL_KEY, 'true')
    set({ tutorialStep: null, tutorialComplete: true })
  },

  requestTutorial: () => set({ tutorialRequested: true }),

  toggleQueue: () => set(state => ({ queueCollapsed: !state.queueCollapsed })),

  setSelectedCitizen: (id) => {
    set({ selectedCitizenId: id })
    if (id !== null && get().tutorialStep === null) {
      // Start per-citizen decision timer (internal, for hesitation scoring)
      set({ decisionTimerStart: Date.now() })
      // Start global shift timer on first selection (never resets mid-shift)
      if (get().shiftStartTime === null) {
        set({ shiftStartTime: Date.now() })
      }
    }
  },

  enqueueCinematic: (cinematic) => {
    const { cinematicQueue, currentCinematic } = get()
    if (currentCinematic === null) {
      set({ currentCinematic: cinematic })
    } else {
      set({ cinematicQueue: [...cinematicQueue, cinematic] })
    }
  },

  advanceCinematic: () => {
    const { cinematicQueue } = get()
    if (cinematicQueue.length === 0) {
      set({ currentCinematic: null })
    } else {
      const [next, ...rest] = cinematicQueue
      set({ currentCinematic: next ?? null, cinematicQueue: rest })
    }
  },

  skipCinematic: () => {
    set({ currentCinematic: null, cinematicQueue: [] })
  },

  addNotification: (type, title, message, opts: { auto_dismiss_ms?: number | null; data?: Record<string, unknown> } = {}) => {
    const notification: Notification = {
      id: crypto.randomUUID(),
      type,
      title,
      message,
      auto_dismiss_ms: opts.auto_dismiss_ms ?? null,
      created_at: new Date().toISOString(),
      data: opts.data,
    }
    set(state => ({ notifications: [...state.notifications, notification] }))

    if (opts.auto_dismiss_ms) {
      setTimeout(() => {
        get().dismissNotification(notification.id)
      }, opts.auto_dismiss_ms)
    }
  },

  dismissNotification: (id) =>
    set(state => ({ notifications: state.notifications.filter(n => n.id !== id) })),

  clearNotifications: () => set({ notifications: [] }),

  openModal: (type, data) => set({ modal: { type, data } }),

  closeModal: () => set({ modal: { type: null } }),

  startDecisionTimer: () => set({ decisionTimerStart: Date.now() }),

  getDecisionElapsedSecs: () => {
    const { decisionTimerStart } = get()
    if (decisionTimerStart === null) return 0
    return (Date.now() - decisionTimerStart) / 1000
  },

  startShiftTimer: () => set(state => ({
    shiftStartTime: state.shiftStartTime ?? Date.now(),
  })),

  getShiftElapsedSecs: () => {
    const { shiftStartTime } = get()
    if (shiftStartTime === null) return 0
    return (Date.now() - shiftStartTime) / 1000
  },

  showShiftMemo: (data) => set(state => ({
    pendingShiftMemo: data,
    memoHistory: [...state.memoHistory, data],
  })),
  dismissShiftMemo: () => set({ pendingShiftMemo: null }),

  setSuppressBriefingForKey: (key) => set({ suppressBriefingForKey: key }),

  markDomainVisited: (domain) => set(state => ({
    newlyUnlockedDomains: state.newlyUnlockedDomains.filter(d => d !== domain),
  })),

  addNewlyUnlockedDomains: (domains) => set(state => ({
    newlyUnlockedDomains: [...new Set([...state.newlyUnlockedDomains, ...domains])],
  })),

  reset: () => set({
    ...initialState,
    memoAcknowledged: false,
    tutorialComplete: localStorage.getItem(TUTORIAL_KEY) === 'true',
    tutorialRequested: get().tutorialRequested,
  }),
}))
