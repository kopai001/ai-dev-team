import './layouts.css'

export default function TitleLayout({ slide }) {
  return (
    <div className="slide slide--title">
      <div className="slide-content slide-content--center">
        {slide.badge && <span className="title-badge">{slide.badge}</span>}
        <h1 className="title-heading">{slide.title}</h1>
        {slide.subtitle && <p className="title-subtitle">{slide.subtitle}</p>}
      </div>
    </div>
  )
}
