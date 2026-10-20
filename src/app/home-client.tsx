"use client";

import { useActionState, useState } from "react";
import Link from "next/link";

import { summonMemorial, type MemorialState } from "./actions";
import { MemorialParchments } from "./memorial-parchments";
import { SummoningGhosts } from "./summoning-ghosts";
import { GraveyardScene } from "./graveyard-scene";
import { MemorialDialog } from "./memorial-dialog";
import styles from "./graveyard.module.css";

const initialState: MemorialState = { status: "idle" };

function RitualMark() {
  return (
    <svg
      aria-hidden="true"
      className="ritual-mark"
      viewBox="0 0 30 30"
      fill="none"
    >
      <path
        d="M20.8 4.9a10.8 10.8 0 1 0 3.9 18.4A9.2 9.2 0 0 1 20.8 4.9Z"
        fill="currentColor"
      />
      <path d="m5.2 8 .8 1.8 1.8.8-1.8.8-.8 1.8-.8-1.8-1.8-.8 1.8-.8.8-1.8Z" fill="currentColor" />
      <path d="m25 17 .6 1.3 1.4.6-1.4.6-.6 1.3-.6-1.3-1.4-.6 1.4-.6.6-1.3Z" fill="currentColor" />
    </svg>
  );
}

function ArrowMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 14" fill="none">
      <path d="M1 7h25M22 2l5 5-5 5" stroke="currentColor" strokeWidth="1.2" />
      <path d="m4 4 3 3-3 3" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

export function HomeClient() {
  const [state, formAction, pending] = useActionState(
    summonMemorial,
    initialState,
  );
  const [dismissed, setDismissed] = useState<MemorialState | null>(null);

  return (
    <main className="occult-page">
      <div className="ritual-glow" aria-hidden="true" />
      <SummoningGhosts active={pending} />
      <section className="ritual-shell" aria-labelledby="page-title">
        <div className="ritual-intro">
          <header className="ritual-header">
            <h1 id="page-title">Summon Their Last Words</h1>
            <p>Enter an X username. See what still lingers.</p>
            <div className="ritual-divider" aria-hidden="true">
              <span />
              <RitualMark />
              <span />
            </div>
          </header>

          <form action={formAction}>
            <div className="summoning-form">
              <label htmlFor="username" className="sr-only">
                X username
              </label>
              <div className="username-field">
                <span aria-hidden="true">@</span>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                  maxLength={16}
                  pattern="@?[A-Za-z0-9_]{1,15}"
                  placeholder="username"
                />
              </div>
              <button type="submit" disabled={pending}>
                {pending ? (
                  <>
                    <span className="ritual-spinner" aria-hidden="true" />
                    Summoning
                  </>
                ) : (
                  <>
                    <ArrowMark />
                    Summon Their Ghost
                    <ArrowMark />
                  </>
                )}
              </button>
            </div>
            <div className={styles.privacy}>
              <label>
                <input name="optOut" type="checkbox" disabled={pending} aria-describedby="privacy-explanation" />
                Don’t add this memorial to the public graveyard.
              </label>
              <p id="privacy-explanation">
                By default, the fictional memorial and its artwork are saved for everyone to see.
                Checking this box keeps this result unsaved; it won’t remove an existing grave.
              </p>
            </div>
          </form>

          <div className="summoning-response" aria-live="polite">
            {state.status === "error" ? (
              <p className="ritual-message ritual-message-error">
                {state.message}
              </p>
            ) : null}

            {pending ? (
              <p className="ritual-message ritual-message-pending">
                Reading the remains, writing the farewell, and developing the apparition…
              </p>
            ) : null}
          </div>

          <p className="ritual-footnote">
            Public accounts only <span aria-hidden="true">·</span> Nothing is
            posted to X
          </p>
        </div>

        {state.status === "success" && dismissed === state && <button type="button"
          className={styles.reopen} onClick={() => setDismissed(null)}>
          Reopen {state.id ? "your memorial" : "your unsaved memorial"}
        </button>}
        <GraveyardScene compact
          refreshKey={state.status === "success" ? `${state.id ?? ""}:${state.memorial.lastWords}` : ""}
          highlightedId={state.status === "success" ? state.id : null} />
        {state.status === "success" && dismissed !== state ? (
          <MemorialDialog onClose={() => setDismissed(state)}>
            <p className={styles.permalink}>
              {state.id ? <Link href={`/graveyard/${state.id}`}>Open permanent memorial ↗</Link>
                : "This memorial was not saved to the graveyard. It will disappear when you leave."}
            </p>
            <MemorialParchments
              memorial={state.memorial}
              displayName={state.displayName}
              hauntingArtwork={state.hauntingArtwork}
              username={state.username}
            />
          </MemorialDialog>
        ) : null}
      </section>
    </main>
  );
}
