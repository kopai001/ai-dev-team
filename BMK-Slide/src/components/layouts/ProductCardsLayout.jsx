import './layouts.css'

function ProsConsList({ label, items, variant }) {
  if (!items?.length) return null

  return (
    <div className={`product-card-section product-card-section--${variant}`}>
      <h3 className="product-card-section-label">{label}</h3>
      <ul className="product-card-list">
        {items.map((item, i) => (
          <li key={i} className="product-card-list-item">
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function ProductCardsLayout({ slide }) {
  const cards = slide.cards ?? []

  return (
    <div className="slide slide--product-cards">
      <div className="product-cards-layout">
        <header className="product-cards-header">
          {slide.eyebrow && <span className="gallery-eyebrow">{slide.eyebrow}</span>}
          <h1 className="product-cards-title">{slide.title}</h1>
        </header>

        <div
          className="product-cards-grid"
          style={{ '--card-cols': cards.length }}
          role="list"
          aria-label={slide.title}
        >
          {cards.map((card, i) => (
            <article key={i} className="product-card" role="listitem">
              <div className="product-card-image-wrap">
                <img
                  src={card.image}
                  alt={card.alt ?? card.title}
                  className="product-card-image"
                  loading="lazy"
                />
              </div>
              <div className="product-card-body">
                <h2 className="product-card-title">{card.title}</h2>
                <ProsConsList label="ข้อดี" items={card.pros} variant="pros" />
                <ProsConsList label="ข้อเสีย" items={card.cons} variant="cons" />
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  )
}
