import './layouts.css'

export default function TwoColumnLayout({ slide }) {
  return (
    <div className="slide slide--content">
      <div className="slide-content">
        {slide.title && <h2 className="content-heading">{slide.title}</h2>}
        <div className="two-col">
          {[slide.left, slide.right].map((col, i) => (
            col && (
              <div key={i} className="two-col-pane">
                {col.heading && <h3 className="col-heading">{col.heading}</h3>}
                {col.bullets && (
                  <ul className="bullet-list">
                    {col.bullets.map((b, j) => (
                      <li key={j} className="bullet-item">{b}</li>
                    ))}
                  </ul>
                )}
                {col.body && <p className="content-body">{col.body}</p>}
              </div>
            )
          ))}
        </div>
      </div>
    </div>
  )
}
