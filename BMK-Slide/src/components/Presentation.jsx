import { useState, useEffect, useCallback, useRef } from 'react'
import SlideWrapper from './SlideWrapper'
import Navigation from './Navigation'
import ProgressBar from './ProgressBar'
import OverviewGrid from './OverviewGrid'
import './Presentation.css'

const TEXT_SCALE_MIN = 0.75
const TEXT_SCALE_MAX = 2
const TEXT_SCALE_STEP = 0.1
const TEXT_SCALE_PRESETS = [1, 1.5, 2]
const TEXT_SCALE_KEY = 'bmk-text-scale'

function hashToIndex(total) {
  const n = parseInt(window.location.hash.replace('#', ''), 10)
  if (Number.isFinite(n) && n >= 1 && n <= total) return n - 1
  return 0
}

function loadTextScale() {
  const stored = parseFloat(localStorage.getItem(TEXT_SCALE_KEY))
  if (Number.isFinite(stored) && stored >= TEXT_SCALE_MIN && stored <= TEXT_SCALE_MAX) {
    return stored
  }
  return 1
}

export default function Presentation({ slides }) {
  const total = slides.length
  const [current, setCurrent] = useState(() => hashToIndex(total))
  const [direction, setDirection] = useState('next')
  const [overview, setOverview] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [textScale, setTextScale] = useState(loadTextScale)
  const containerRef = useRef(null)
  const skipHashUpdate = useRef(false)

  // Sync state → hash
  useEffect(() => {
    window.location.hash = String(current + 1)
  }, [current])

  // Sync hash → state (browser back/forward)
  useEffect(() => {
    const onHash = () => {
      if (skipHashUpdate.current) return
      const idx = hashToIndex(total)
      setDirection(idx > current ? 'next' : 'prev')
      setCurrent(idx)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [current, total])

  const goTo = useCallback((index, dir = 'next') => {
    if (index < 0 || index >= total) return
    setDirection(dir)
    setCurrent(index)
  }, [total])

  const next = useCallback(() => goTo(current + 1, 'next'), [current, goTo])
  const prev = useCallback(() => goTo(current - 1, 'prev'), [current, goTo])

  useEffect(() => {
    const onKey = (e) => {
      if (overview) {
        if (e.key === 'Escape' || e.key === 'g') setOverview(false)
        return
      }
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
        case ' ':
        case 'PageDown':
          e.preventDefault(); next(); break
        case 'ArrowLeft':
        case 'ArrowUp':
        case 'PageUp':
          e.preventDefault(); prev(); break
        case 'Home':
          e.preventDefault(); goTo(0, 'prev'); break
        case 'End':
          e.preventDefault(); goTo(total - 1, 'next'); break
        case 'f': case 'F':
          toggleFullscreen(); break
        case 'g': case 'G':
          setOverview(true); break
        case 'Escape':
          if (document.fullscreenElement) document.exitFullscreen(); break
        default: break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [current, overview, next, prev, goTo, total])

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) containerRef.current?.requestFullscreen()
    else document.exitFullscreen()
  }

  const handleOverviewSelect = (index) => {
    goTo(index, index > current ? 'next' : 'prev')
    setOverview(false)
  }

  const setTextScaleValue = useCallback((value) => {
    const clamped = Math.min(TEXT_SCALE_MAX, Math.max(TEXT_SCALE_MIN, Math.round(value * 10) / 10))
    setTextScale(clamped)
    localStorage.setItem(TEXT_SCALE_KEY, String(clamped))
  }, [])

  const changeTextScale = useCallback((delta) => {
    setTextScale((prev) => {
      const next = Math.min(TEXT_SCALE_MAX, Math.max(TEXT_SCALE_MIN, Math.round((prev + delta) * 10) / 10))
      localStorage.setItem(TEXT_SCALE_KEY, String(next))
      return next
    })
  }, [])

  return (
    <div
      className="presentation"
      ref={containerRef}
      style={{ '--text-scale': textScale }}
    >
      <ProgressBar current={current} total={total} />

      {overview ? (
        <OverviewGrid
          slides={slides}
          current={current}
          textScale={textScale}
          textScaleMin={TEXT_SCALE_MIN}
          textScaleMax={TEXT_SCALE_MAX}
          onDecreaseText={() => changeTextScale(-TEXT_SCALE_STEP)}
          onIncreaseText={() => changeTextScale(TEXT_SCALE_STEP)}
          onSetTextScale={setTextScaleValue}
          textScalePresets={TEXT_SCALE_PRESETS}
          onSelect={handleOverviewSelect}
          onClose={() => setOverview(false)}
        />
      ) : (
        <SlideWrapper
          slides={slides}
          currentIndex={current}
          direction={direction}
        />
      )}

      <Navigation
        current={current}
        total={total}
        onPrev={prev}
        onNext={next}
        onOverview={() => setOverview(!overview)}
        onFullscreen={toggleFullscreen}
        isFullscreen={isFullscreen}
      />
    </div>
  )
}
