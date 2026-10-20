import Link from "next/link";

export default function MissingMemorial() {
  return <section className="memorial-parchment">
    <h2>This grave is unmarked.</h2>
    <p>The memorial may be unavailable or removed.</p>
    <Link href="/graveyard">Return to the graveyard</Link>
  </section>;
}
