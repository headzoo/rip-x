import Link from "next/link";
import { GraveyardScene } from "../graveyard-scene";
import styles from "../graveyard.module.css";

export const metadata = { title: "The Graveyard · RIP-X" };

export default function GraveyardPage() {
  return <main className="occult-page">
    <div className="ritual-shell">
      <nav className={styles.back}><Link href="/">← Summon another spirit</Link></nav>
      <GraveyardScene />
    </div>
  </main>;
}
