import './layouts.css'

const ICONS = {
  trust: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  ),
  key: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <circle cx="7.5" cy="15.5" r="5.5" />
      <path d="m21 2-9.6 9.6" />
      <path d="M15.5 7.5l3 3L22 7l-3-3" />
    </svg>
  ),
  investment: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <path d="M3 3v18h18" />
      <path d="m7 14 4-4 4 4 5-5" />
    </svg>
  ),
  factory: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
      <path d="M17 18h1M12 18h1M7 18h1" />
    </svg>
  ),
  document: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
    </svg>
  ),
  'human-error': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4M12 16h.01" />
    </svg>
  ),
  performance: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <path d="M3 3v18h18" />
      <path d="m7 16 4-6 4 4 6-8" />
    </svg>
  ),
  ipo: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <rect x="3" y="8" width="5" height="12" rx="1" />
      <rect x="10" y="5" width="5" height="15" rx="1" />
      <rect x="17" y="10" width="5" height="10" rx="1" />
      <path d="M3 20h19" />
    </svg>
  ),
}

export default function IconListLayout({ slide }) {
  const items = slide.items ?? []

  return (
    <div className="slide slide--icon-list">
      <div className="slide-content">
        <header className="icon-list-header">
          {slide.eyebrow && <span className="gallery-eyebrow">{slide.eyebrow}</span>}
          {slide.title && <h2 className="icon-list-title">{slide.title}</h2>}
          {slide.subtitle && <p className="icon-list-subtitle">{slide.subtitle}</p>}
        </header>

        <ul className="icon-list" aria-label={slide.title}>
          {items.map((item, i) => (
            <li key={i} className="icon-list-item">
              <div className="icon-list-item-icon">
                {ICONS[item.icon] ?? ICONS.trust}
              </div>
              <p className="icon-list-item-text">{item.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
