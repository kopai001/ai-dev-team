import './layouts.css'
import { ICONS } from './IconListLayout'

function ColumnIconList({ items, label }) {
  if (!items?.length) return null

  return (
    <ul className="icon-list icon-list--compact" aria-label={label}>
      {items.map((item, j) => (
        <li key={j} className="icon-list-item">
          <div className="icon-list-item-icon">
            {ICONS[item.icon] ?? ICONS.trust}
          </div>
          <p className="icon-list-item-text">{item.text}</p>
        </li>
      ))}
    </ul>
  )
}

export default function TwoColumnLayout({ slide }) {
  return (
    <div className="slide slide--content">
      <div className="slide-content">
        {slide.eyebrow && <span className="gallery-eyebrow">{slide.eyebrow}</span>}
        {slide.title && <h2 className="content-heading">{slide.title}</h2>}
        <div className="two-col">
          {[slide.left, slide.right].map((col, i) => (
            col && (
              <div
                key={i}
                className={`two-col-pane${col.image ? ' two-col-pane--image' : ''}${col.items ? ' two-col-pane--icon-list' : ''}`}
              >
                {col.heading && <h3 className="col-heading">{col.heading}</h3>}
                {col.bullets && (
                  <ul className="bullet-list">
                    {col.bullets.map((b, j) => (
                      <li key={j} className="bullet-item">{b}</li>
                    ))}
                  </ul>
                )}
                {col.body && <p className="content-body">{col.body}</p>}
                <ColumnIconList items={col.items} label={col.heading} />
                {col.image && (
                  <img
                    src={col.image.src}
                    alt={col.image.alt ?? ''}
                    className={`two-col-image${col.image.fit === 'cover' ? ' two-col-image--cover' : ''}`}
                  />
                )}
              </div>
            )
          ))}
        </div>
      </div>
    </div>
  )
}
