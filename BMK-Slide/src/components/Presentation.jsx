import { useState, useEffect, useCallback, useRef } from 'react'
import SlideWrapper from './SlideWrapper'
import Navigation from './Navigation'
import ProgressBar from './ProgressBar'
import OverviewGrid from './OverviewGrid'
import './Presentation.css'

export default function Presentation({ slides }) {
  const [current, setCurrent] = useState(0)
  const [direction, setDirection] = useState('next')
  const [overview, setOverview] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const containerRef = useRef(null)
  const total = slides.length

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
          e.preventDefault()
          next()
          break
        case 'ArrowLeft':
        case 'ArrowUp':
        case 'PageUp':
          e.preventDefault()
          prev()
          break
        case 'Home':
          e.preventDefault()
          goTo(0, 'prev')
          break
        case 'End':
          e.preventDefault()
          goTo(total - 1, 'next')
          break
        case 'f':
        case 'F':
          toggleFullscreen()
          break
        case 'g':
        case 'G':
          setOverview(true)
          break
        case 'Escape':
          if (document.fullscreenElement) document.exitFullscreen()
          break
        default:
          break
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
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  const handleOverviewSelect = (index) => {
    goTo(index, index > current ? 'next' : 'prev')
    setOverview(false)
  }

  return (
    <div className="presentation" ref={containerRef}>
      <ProgressBar current={current} total={total} />

      {overview ? (
        <OverviewGrid
          slides={slides}
          current={current}
          onSelect={handleOverviewSelect}
          onClose={() => setOverview(false)}
        />
      ) : (
        <SlideWrapper
          key={current}
          slide={slides[current]}
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
