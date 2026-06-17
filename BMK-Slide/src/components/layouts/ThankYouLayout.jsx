import "./layouts.css";

export default function ThankYouLayout({ slide }) {
  return (
    <div className="slide slide--thank-you">
      <div className="thank-you-layout">
        {slide.logo && (
          <img
            src={slide.logo}
            alt="Bonmek Co., Ltd."
            className="thank-you-logo"
          />
        )}

        <div className="thank-you-main">
          <div className="thank-you-left">
            <h1 className="thank-you-heading">{slide.title ?? "Thank You"}</h1>
            <p className="thank-you-name">{slide.nameTh}</p>
            {slide.nickname && (
              <span className="thank-you-nickname">{slide.nickname}</span>
            )}

            <ul className="thank-you-contacts">
              {slide.email && (
                <li className="thank-you-contact-row">
                  <span className="thank-you-contact-key">Email</span>
                  <span className="thank-you-contact-val">{slide.email}</span>
                </li>
              )}
              {slide.line && (
                <li className="thank-you-contact-row">
                  <span className="thank-you-contact-key">Line</span>
                  <span className="thank-you-contact-val">{slide.line}</span>
                </li>
              )}
              {slide.phone && (
                <li className="thank-you-contact-row">
                  <span className="thank-you-contact-key">Tel</span>
                  <span className="thank-you-contact-val">{slide.phone}</span>
                </li>
              )}
            </ul>
          </div>

          <div className="thank-you-visuals">
            {slide.photo && (
              <figure className="thank-you-photo">
                <img src={slide.photo} alt={slide.photoAlt ?? slide.nameTh} />
              </figure>
            )}
            {slide.customers && (
              <figure className="thank-you-customers">
                <img
                  src={slide.customers}
                  alt={slide.customersAlt ?? "Our Customers"}
                />
              </figure>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
