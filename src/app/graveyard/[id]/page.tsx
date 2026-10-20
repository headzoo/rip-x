import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicMemorial } from "@/lib/memorial-repository";
import { MemorialParchments } from "../../memorial-parchments";
import styles from "../../graveyard.module.css";

export const metadata = {
  title: "A Fictional Memorial · RIP-X",
  robots: { index: false, follow: false },
};

async function MemorialContent({ params }: { params: Promise<{ id: string }> }) {
  const memorial = await getPublicMemorial((await params).id);
  if (!memorial) notFound();
  return <MemorialParchments {...memorial} />;
}

export default function MemorialPage({ params }: { params: Promise<{ id: string }> }) {
  return <main className="occult-page">
    <div className="ritual-shell">
      <nav className={styles.back}><Link href="/graveyard">← Back to the graveyard</Link></nav>
      <Suspense fallback={<p role="status">Opening the archive…</p>}>
        <MemorialContent params={params} />
      </Suspense>
    </div>
  </main>;
}
