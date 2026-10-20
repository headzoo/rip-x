"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type MouseEvent } from "react";
import type { GravePage, SavedMemorial } from "@/lib/memorial-contract";
import { MemorialParchments } from "./memorial-parchments";
import { MemorialDialog } from "./memorial-dialog";
import styles from "./graveyard.module.css";

const variants = ["arch", "gothic", "broken", "cross", "urn", "scroll"];

function GraveContents({ id }: { id: string }) {
  const [result, setResult] = useState<{ memorial?: SavedMemorial; error?: string }>({});
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const abort = new AbortController();
    fetch(`/api/graveyard/${id}`, { signal: abort.signal, cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setResult({ memorial: data });
      })
      .catch((error) => {
        if (!abort.signal.aborted) setResult({ error: error.message || "The archive could not be opened." });
      });
    return () => abort.abort();
  }, [id, attempt]);
  if (result.error) return <div className={styles.notice} role="alert">
    <p>{result.error}</p><button onClick={() => { setResult({}); setAttempt(attempt + 1); }}>Try again</button>
  </div>;
  if (!result.memorial) return <p className={styles.notice} role="status">Opening the archive…</p>;
  return <>
    <p className={styles.permalink}><Link href={`/graveyard/${id}`}>Open permanent memorial ↗</Link></p>
    <MemorialParchments {...result.memorial} />
  </>;
}

export function GraveyardScene({ compact = false, refreshKey = "", highlightedId }: {
  compact?: boolean; refreshKey?: string; highlightedId?: string | null;
}) {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [attempt, setAttempt] = useState(0);
  const [response, setResponse] = useState<{ key: string; data?: GravePage; error?: string }>();
  const [selected, setSelected] = useState<string | null>(null);
  const requestKey = `${compact}:${query}:${page}:${refreshKey}:${attempt}`;
  const current = response?.key === requestKey ? response : undefined;

  useEffect(() => {
    const abort = new AbortController();
    const params = new URLSearchParams({ q: query, page: String(page), compact: compact ? "1" : "0" });
    fetch(`/api/graveyard?${params}`, { signal: abort.signal, cache: "no-store" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setResponse({ key: requestKey, data });
      }).catch((error) => {
        if (!abort.signal.aborted) setResponse({ key: requestKey, error: error.message || "The gates could not be opened." });
      });
    return () => abort.abort();
  }, [compact, query, page, requestKey]);

  function open(event: MouseEvent<HTMLAnchorElement>, id: string) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    setSelected(id);
  }

  return (
    <section className={styles.graveyard} aria-labelledby="graveyard-title">
      <header className={styles.heading}>
        <p className={styles.eyebrow}>The internet never forgets. Neither do we.</p>
        <h2 id="graveyard-title">{compact ? "The Recently Departed" : "The Graveyard"}</h2>
        <p>Fictional endings. Restless personalities. Click a headstone to pay your respects.</p>
        {!compact && <form className={styles.search} onSubmit={(event) => {
          event.preventDefault(); setQuery(search.trim()); setPage(1);
        }}>
          <label className="sr-only" htmlFor="grave-search">Find a name or X username</label>
          <input id="grave-search" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Find a lost soul…" maxLength={50} type="search" />
          <button>Search graves</button>
        </form>}
      </header>
      <div className={styles.scene} aria-busy={!current}>
        <div className={styles.fog} aria-hidden="true" />
        <div className={`${styles.fog} ${styles.fogFar}`} aria-hidden="true" />
        {!current ? <p className={styles.notice} role="status">Peering through the mist…</p>
          : current.error ? <div className={styles.notice} role="alert">
            <p>{current.error}</p><button onClick={() => setAttempt(attempt + 1)}>Try again</button>
          </div>
          : current.data?.graves.length ? <ul className={styles.plots}>
            {current.data.graves.map((grave) => (
              <li key={grave.id} className={styles.plot}>
                <Link href={`/graveyard/${grave.id}`} prefetch={false}
                  onClick={(event) => open(event, grave.id)}
                  className={`${styles.headstone} ${highlightedId === grave.id ? styles.newGrave : ""}`}
                  aria-label={`Read the fictional memorial for ${grave.displayName}, @${grave.username}`}>
                  <Image src={`/images/graveyard/headstone-${variants[grave.headstoneVariant % variants.length]}.webp`}
                    alt="" width={512} height={512} sizes="(max-width: 600px) 46vw, 240px" />
                  <span className={styles.inscription}>
                    <span className={styles.rest}>Here lies</span>
                    <span className={styles.name}>{grave.displayName}</span>
                    <span className={styles.username}>@{grave.username}</span>
                    <span className={styles.flourish} aria-hidden="true">✦</span>
                  </span>
                  <span className={styles.epitaph}>{grave.epitaph}</span>
                </Link>
              </li>
            ))}
          </ul> : <div className={styles.notice}>
            <span className={styles.emptyMark} aria-hidden="true">☾</span>
            <h3>{query ? "No souls by that name." : "Not a soul. Yet."}</h3>
            <p>{query ? "Try another name or username." : "Summon a ghost to leave the first headstone in the mist."}</p>
          </div>}
      </div>
      <footer className={styles.footer}>
        {compact ? <Link href="/graveyard">Enter the full graveyard <span aria-hidden="true">→</span></Link>
          : <nav className={styles.pagination} aria-label="Graveyard pages">
            <button disabled={page === 1 || !current} onClick={() => setPage(page - 1)}>← Newer souls</button>
            <span aria-live="polite">Page {page}</span>
            <button disabled={!current?.data?.hasMore} onClick={() => setPage(page + 1)}>Older souls →</button>
          </nav>}
        <p>AI-generated fiction. No actual deaths are implied.</p>
      </footer>
      {selected && <MemorialDialog onClose={() => setSelected(null)}>
        <GraveContents key={selected} id={selected} />
      </MemorialDialog>}
    </section>
  );
}
