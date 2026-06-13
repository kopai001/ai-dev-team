import './OverviewGrid.css'

export default function OverviewGrid({ slides, current, onSelect, onClose }) {
  return (
    <div className="overview-backdrop" onClick={onClose}>
      <div className="overview-grid" onClick={(e) => e.stopPropagation()}>
        {slides.map((slide, i) => (
          <button
            key={slide.id ?? i}
            className={`overview-thumb ${i === current ? 'active' : ''}`}
            onClick={() => onSelect(i)}
            aria-label={`Go to slide ${i + 1}`}
          >
            <div className="overview-thumb-inner">
              <span className="overview-thumb-title">
                {slide.title ?? slide.quote ?? `Slide ${i + 1}`}
              </span>
              <span className="overview-thumb-badge">{slide.layout}</span>
            </div>
            <span className="overview-num">{i + 1}</span>
          </button>
        ))}
      </div>
      <p className="overview-hint">Press <kbd>G</kbd> or <kbd>Esc</kbd> to close</p>
    </div>
  )
}
