import Image from "next/image";
import type { ReactNode } from "react";

import type { HauntingArtwork } from "@/lib/haunting-image";
import type { Memorial } from "@/lib/memorial";

function Parchment({
  children,
  labelledBy,
  className = "",
}: {
  children: ReactNode;
  labelledBy: string;
  className?: string;
}) {
  return (
    <article
      className={`memorial-parchment ${className}`}
      aria-labelledby={labelledBy}
    >
      <div className="parchment-pin parchment-pin-left" aria-hidden="true" />
      <div className="parchment-pin parchment-pin-right" aria-hidden="true" />
      <div className="obituary-ornament" aria-hidden="true">
        <span>✦</span>
        <span>☾</span>
        <span>✦</span>
      </div>
      {children}
    </article>
  );
}

export function MemorialParchments({
  memorial,
  displayName,
  hauntingArtwork,
  username,
}: {
  memorial: Memorial;
  displayName: string;
  hauntingArtwork: HauntingArtwork;
  username: string;
}) {
  return (
    <>
      <Parchment labelledBy="last-words-title" className="last-words-parchment">
        <p className="obituary-kicker">I · An imagined farewell</p>
        <h2 id="last-words-title">Last Words</h2>
        <p className="obituary-identity">{displayName} · @{username}</p>
        <blockquote className="last-words-quote">
          <p>“{memorial.lastWords}”</p>
        </blockquote>
        <div className="obituary-flourish" aria-hidden="true">❦</div>
      </Parchment>

      <Parchment labelledBy="obituary-title">
        <p className="obituary-kicker">II · The obituary</p>
        <h2 id="obituary-title">{memorial.obituary.title}</h2>
        <blockquote>{memorial.obituary.epitaph}</blockquote>
        <div className="obituary-copy">
          {memorial.obituary.paragraphs.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
        <div className="obituary-flourish" aria-hidden="true">❦</div>
        <p className="obituary-closing">{memorial.obituary.closingLine}</p>
      </Parchment>

      <Parchment labelledBy="haunting-title" className="haunting-parchment">
        <p className="obituary-kicker">III · The haunting</p>
        <h2 id="haunting-title">{memorial.haunting.location}</h2>
        <p className="haunting-subtitle">Where their spirit lingers</p>
        <figure className="haunting-artwork">
          <div className="haunting-artwork-mat">
            <Image
              src={hauntingArtwork.src}
              alt={hauntingArtwork.alt}
              width={hauntingArtwork.width}
              height={hauntingArtwork.height}
              sizes="(max-width: 680px) calc(100vw - 5rem), 40rem"
              unoptimized
            />
          </div>
          <figcaption>An apparition captured at the scene</figcaption>
        </figure>
        <div className="obituary-copy">
          {memorial.haunting.paragraphs.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
        <dl className="haunting-business">
          <dt>Unfinished business</dt>
          <dd>{memorial.haunting.unfinishedBusiness}</dd>
        </dl>
        <div className="obituary-flourish" aria-hidden="true">❦</div>
        <p className="obituary-disclaimer">
          These last words, obituary, and haunting are AI-generated fiction.
          No actual death is implied.
        </p>
      </Parchment>
    </>
  );
}
