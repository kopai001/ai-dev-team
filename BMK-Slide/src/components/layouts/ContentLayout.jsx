import './layouts.css'

export default function ContentLayout({ slide }) {
  return (
    <div className="slide slide--content">
      <div className="slide-content">
        <h2 className="content-heading">{slide.title}</h2>
        {slide.bullets && (
          <ul className="bullet-list">
            {slide.bullets.map((b, i) => (
              <li key={i} className="bullet-item">{b}</li>
            ))}
          </ul>
        )}
        {slide.body && <p className="content-body">{slide.body}</p>}
      </div>
    </div>
  )
}
