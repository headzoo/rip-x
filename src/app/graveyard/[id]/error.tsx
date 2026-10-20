"use client";

export default function MemorialError({ reset }: { reset(): void }) {
  return <section className="memorial-parchment" role="alert">
    <h2>The archive is temporarily closed.</h2>
    <p>We could not retrieve this memorial.</p>
    <button onClick={reset}>Try again</button>
  </section>;
}
