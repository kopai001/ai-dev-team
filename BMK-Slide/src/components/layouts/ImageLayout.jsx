import './layouts.css'

export default function ImageLayout({ slide }) {
  return (
    <div className="slide slide--image" style={slide.bg ? { background: slide.bg } : undefined}>
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
  )
}
