import './layouts.css'

export default function QuoteLayout({ slide }) {
  return (
    <div className="slide slide--quote">
      <div className="slide-content slide-content--center">
        <blockquote className="quote-text">"{slide.quote}"</blockquote>
        {slide.author && <cite className="quote-author">— {slide.author}</cite>}
      </div>
    </div>
  )
}
