import './layouts.css'

export default function ImageLayout({ slide }) {
  const hasHeader = slide.eyebrow || slide.title

  return (
    <div
      className={`slide slide--image${hasHeader ? ' slide--image-with-header' : ''}`}
      style={slide.bg ? { background: slide.bg } : undefined}
    >
      {hasHeader && (
        <header className="image-layout-header">
          {slide.eyebrow && <span className="gallery-eyebrow">{slide.eyebrow}</span>}
          {slide.title && <h1 className="gallery-title">{slide.title}</h1>}
        </header>
      )}

      <div className="image-layout-body">
        {slide.src && (
          <img
            src={slide.src}
            alt={slide.alt ?? slide.caption ?? ''}
            className={`slide-image ${slide.fit === 'contain' ? 'slide-image--contain' : 'slide-image--cover'}`}
          />
        )}
        {slide.caption && (
          <div className="image-caption-bar">
            <p className="image-caption">{slide.caption}</p>
          </div>
        )}
      </div>
    </div>
  )
}
