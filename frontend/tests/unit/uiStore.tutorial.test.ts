import { beforeEach, describe, it, expect } from 'vitest'
import { useUIStore } from '@/stores/uiStore'

// localStorage is polyfilled by tests/unit/setup.ts

function resetStore() {
  localStorage.clear()
  useUIStore.setState({
    memoAcknowledged: false,
    tutorialStep: null,
    tutorialComplete: false,
    tutorialRequested: false,
  })
}

describe('uiStore — tutorial & memo', () => {
  beforeEach(() => {
    resetStore()
  })

  describe('memoAcknowledged', () => {
    it('resets to false even when localStorage memo key is set', () => {
      localStorage.setItem('civic-harmony-memo-acknowledged', 'true')
      useUIStore.setState({ memoAcknowledged: true })
      useUIStore.getState().reset()
      expect(useUIStore.getState().memoAcknowledged).toBe(false)
    })
  })

  describe('acknowledgeMemo', () => {
    it('sets tutorialStep to 0 when tutorialComplete is false', () => {
      useUIStore.getState().acknowledgeMemo()
      expect(useUIStore.getState().tutorialStep).toBe(0)
      expect(useUIStore.getState().memoAcknowledged).toBe(true)
    })

    it('leaves tutorialStep null when tutorialComplete is true and tutorialRequested is false', () => {
      useUIStore.setState({ tutorialComplete: true, tutorialRequested: false })
      useUIStore.getState().acknowledgeMemo()
      expect(useUIStore.getState().tutorialStep).toBe(null)
    })

    it('sets tutorialStep to 0 when tutorialComplete is true but tutorialRequested is true', () => {
      useUIStore.setState({ tutorialComplete: true, tutorialRequested: true })
      useUIStore.getState().acknowledgeMemo()
      expect(useUIStore.getState().tutorialStep).toBe(0)
      expect(useUIStore.getState().tutorialRequested).toBe(false)
    })
  })

  describe('skipTutorial', () => {
    it('clears tutorialStep, marks tutorialComplete true, writes to localStorage', () => {
      useUIStore.setState({ tutorialStep: 2 })
      useUIStore.getState().skipTutorial()
      expect(useUIStore.getState().tutorialStep).toBe(null)
      expect(useUIStore.getState().tutorialComplete).toBe(true)
      expect(localStorage.getItem('civic-harmony-tutorial-complete')).toBe('true')
    })
  })

  describe('requestTutorial', () => {
    it('sets tutorialRequested to true', () => {
      useUIStore.getState().requestTutorial()
      expect(useUIStore.getState().tutorialRequested).toBe(true)
    })
  })

  describe('reset', () => {
    it('always resets memoAcknowledged to false', () => {
      useUIStore.setState({ memoAcknowledged: true })
      useUIStore.getState().reset()
      expect(useUIStore.getState().memoAcknowledged).toBe(false)
    })

    it('re-reads tutorialComplete from localStorage at reset time', () => {
      localStorage.setItem('civic-harmony-tutorial-complete', 'true')
      useUIStore.getState().reset()
      expect(useUIStore.getState().tutorialComplete).toBe(true)
    })

    it('preserves tutorialRequested across reset', () => {
      useUIStore.setState({ tutorialRequested: true })
      useUIStore.getState().reset()
      expect(useUIStore.getState().tutorialRequested).toBe(true)
    })
  })
})
