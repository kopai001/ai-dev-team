import './layouts.css'

export default function SectionLayout({ slide }) {
  return (
    <div className="slide slide--section">
      <div className="slide-content slide-content--center">
        {slide.subtitle && <p className="section-eyebrow">{slide.subtitle}</p>}
        <h2 className="section-heading">{slide.title}</h2>
      </div>
    </div>
  )
}
