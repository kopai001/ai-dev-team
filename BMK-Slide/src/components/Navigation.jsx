import './Navigation.css'

export default function Navigation({
  current, total, onPrev, onNext, onOverview, onFullscreen, isFullscreen
}) {
  return (
    <nav className="nav-bar">
      <div className="nav-left">
        <button
          className="nav-btn icon-btn"
          onClick={onOverview}
          title="Overview (G)"
          aria-label="Slide overview"
        >
          <GridIcon />
        </button>
        <button
          className="nav-btn icon-btn"
          onClick={onFullscreen}
          title="Fullscreen (F)"
          aria-label="Toggle fullscreen"
        >
          {isFullscreen ? <ExitFullscreenIcon /> : <FullscreenIcon />}
        </button>
      </div>

      <div className="nav-right">
        <div className="nav-center">
          <button
            className="nav-btn arrow-btn"
            onClick={onPrev}
            disabled={current === 0}
            aria-label="Previous slide"
            title="Previous (←)"
          >
            ←
          </button>

          <span className="nav-counter">
            {current + 1} <span className="nav-sep">/</span> {total}
          </span>

          <button
            className="nav-btn arrow-btn"
            onClick={onNext}
            disabled={current === total - 1}
            aria-label="Next slide"
            title="Next (→)"
          >
            →
          </button>
        </div>
      </div>
    </nav>
  )
}

function GridIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="1" y="1" width="6.5" height="6.5" rx="1" />
      <rect x="10.5" y="1" width="6.5" height="6.5" rx="1" />
      <rect x="1" y="10.5" width="6.5" height="6.5" rx="1" />
      <rect x="10.5" y="10.5" width="6.5" height="6.5" rx="1" />
    </svg>
  )
}

function FullscreenIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M1 6V2h4M17 6V2h-4M1 12v4h4M17 12v4h-4" />
    </svg>
  )
}

function ExitFullscreenIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M5 1v4H1M13 1v4h4M5 17v-4H1M13 17v-4h4" />
    </svg>
  )
}
