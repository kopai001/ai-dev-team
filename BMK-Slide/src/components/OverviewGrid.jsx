import './OverviewGrid.css'

export default function OverviewGrid({
  slides,
  current,
  textScale,
  textScaleMin,
  textScaleMax,
  textScalePresets,
  onDecreaseText,
  onIncreaseText,
  onSetTextScale,
  onSelect,
  onClose,
}) {
  return (
    <div className="overview-backdrop" onClick={onClose}>
      <div className="overview-panel" onClick={(e) => e.stopPropagation()}>
        <div className="overview-toolbar">
          <span className="overview-toolbar-label">Text size</span>
          <button
            type="button"
            className="overview-size-btn"
            onClick={onDecreaseText}
            disabled={textScale <= textScaleMin}
            aria-label="Decrease text size"
            title="Decrease text size"
          >
            −
          </button>
          <span className="overview-size-value">{Math.round(textScale * 100)}%</span>
          <button
            type="button"
            className="overview-size-btn"
            onClick={onIncreaseText}
            disabled={textScale >= textScaleMax}
            aria-label="Increase text size"
            title="Increase text size"
          >
            +
          </button>
          <div className="overview-size-presets">
            {textScalePresets.map((preset) => (
              <button
                key={preset}
                type="button"
                className={`overview-preset-btn ${textScale === preset ? 'active' : ''}`}
                onClick={() => onSetTextScale(preset)}
                aria-label={`Set text size to ${preset * 100}%`}
                title={`${preset * 100}%`}
              >
                {preset * 100}%
              </button>
            ))}
          </div>
        </div>
        <div className="overview-grid">
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
    </div>
  )
}
