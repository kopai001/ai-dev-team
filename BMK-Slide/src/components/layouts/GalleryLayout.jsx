import './layouts.css'

function ThumbColumn({ items }) {
  const rowFr = items.map((img) => `${img.h / img.w}fr`).join(' ')

  return (
    <div className="gallery-col" style={{ gridTemplateRows: rowFr }}>
      {items.map((img) => (
        <figure key={img.src} className="gallery-item" role="listitem">
          <img src={img.src} alt={img.alt} loading="lazy" />
        </figure>
      ))}
    </div>
  )
}

export default function GalleryLayout({ slide }) {
  const featured = slide.featured ?? slide.images?.find((img) => img.featured)
  const columns = slide.columns ?? []

  return (
    <div className="slide slide--gallery">
      <div className="gallery-layout">
        <header className="gallery-header">
          {slide.eyebrow && <span className="gallery-eyebrow">{slide.eyebrow}</span>}
          <h1 className="gallery-title">{slide.title}</h1>
          {slide.subtitle && <p className="gallery-subtitle">{slide.subtitle}</p>}
        </header>

        <div className="gallery-body" role="list" aria-label={slide.title}>
          {featured && (
            <figure
              className="gallery-item gallery-item--hero"
              style={{ aspectRatio: `${featured.w} / ${featured.h}` }}
              role="listitem"
            >
              <img src={featured.src} alt={featured.alt} loading="eager" />
            </figure>
          )}

          <div className="gallery-thumbs">
            {columns.map((items, i) => (
              <ThumbColumn key={i} items={items} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
