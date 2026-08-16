import { useEffect } from 'react'
import './CardDetailModal.css'

export default function CardDetailModal({ card, onClose }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const info = card.card_info || {}
  const tcgPrices = card.tcgplayer?.prices || []
  const cmPrices = card.cardmarket?.prices || []

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal__panel" onClick={(e) => e.stopPropagation()}>
        <button className="modal__close" onClick={onClose} aria-label="Cerrar">
          ×
        </button>

        <div className="modal__body">
          <img
            className="modal__image"
            src={`/api/image?id=${encodeURIComponent(card.id)}&size=high`}
            alt={info.name}
          />

          <div className="modal__info">
            <h2>{info.name}</h2>
            <p className="modal__set">
              {info.set_name} · {info.card_number}
            </p>

            <div className="modal__badges">
              {info.rarity && <span className="modal__badge">{info.rarity}</span>}
              {info.card_type && <span className="modal__badge">{info.card_type}</span>}
              {info.stage && <span className="modal__badge">{info.stage}</span>}
            </div>

            {(tcgPrices.length > 0 || cmPrices.length > 0) && (
              <div className="modal__prices">
                {tcgPrices.length > 0 && (
                  <div className="modal__price-card modal__price-card--tcg">
                    <h3>TCGPlayer · USD</h3>
                    {tcgPrices.map((p) => (
                      <div className="modal__price-row" key={p.sub_type_name}>
                        <span>{p.sub_type_name}</span>
                        <span className="modal__price-main">
                          {p.market_price ? `$${p.market_price}` : '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {cmPrices.length > 0 && (
                  <div className="modal__price-card modal__price-card--cm">
                    <h3>CardMarket · EUR</h3>
                    {cmPrices.map((p) => (
                      <div className="modal__price-row" key={p.variant_type}>
                        <span>{p.variant_type}</span>
                        <span className="modal__price-main">
                          {p.trend ? `€${p.trend}` : p.avg ? `€${p.avg}` : '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {!tcgPrices.length && !cmPrices.length && (
              <p className="modal__no-price">Sin precios disponibles</p>
            )}

            {info.card_text && (
              <div className="modal__text">
                <h3>Texto</h3>
                <p dangerouslySetInnerHTML={{ __html: info.card_text }} />
              </div>
            )}

            <div className="modal__links">
              {card.tcgplayer?.url && (
                <a href={card.tcgplayer.url} target="_blank" rel="noreferrer">
                  Ver en TCGPlayer
                </a>
              )}
              {card.cardmarket?.product_url && (
                <a href={card.cardmarket.product_url} target="_blank" rel="noreferrer">
                  Ver en CardMarket
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}