import { Fragment } from 'react'
import './layouts.css'

const ICONS = {
  requirements: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <path d="M9 12h6M9 16h4" />
    </svg>
  ),
  design: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 17h7M17.5 14v7" />
    </svg>
  ),
  development: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  ),
  deploy: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </svg>
  ),
}

function StepBadges({ badges }) {
  const items = Array.isArray(badges) ? badges : badges ? [badges] : []
  if (!items.length) return null

  return (
    <div className="timeline-card-badges">
      {items.map((badge, i) => (
        <span key={i} className="timeline-card-badge">
          {badge}
        </span>
      ))}
    </div>
  )
}

export default function TimelineLayout({ slide }) {
  const steps = slide.steps ?? []

  return (
    <div className="slide slide--timeline">
      <div className="timeline-layout">
        <header className="timeline-header">
          {slide.eyebrow && <span className="gallery-eyebrow">{slide.eyebrow}</span>}
          <h1 className="timeline-title">{slide.title}</h1>
        </header>

        <div className="timeline-track" role="list" aria-label={slide.title}>
          {steps.map((step, i) => (
            <Fragment key={i}>
              <article className="timeline-card" role="listitem">
                <div className="timeline-card-step" aria-hidden="true">
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div className="timeline-card-icon">
                  {ICONS[step.icon] ?? ICONS.requirements}
                </div>
                <h2 className="timeline-card-title">{step.title}</h2>
                <StepBadges badges={step.badge ?? step.badges} />
                {step.description && (
                  <p className="timeline-card-desc">{step.description}</p>
                )}
              </article>
              {i < steps.length - 1 && (
                <span className="timeline-connector" aria-hidden="true" />
              )}
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  )
}
