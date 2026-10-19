"use client";

import { useActionState, useEffect, useRef } from "react";

import { summonMemorial, type MemorialState } from "./actions";
import { MemorialParchments } from "./memorial-parchments";

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

export default function Home() {
  const [state, formAction, pending] = useActionState(
    summonMemorial,
    initialState,
  );
  const memorialRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.status === "success") {
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const scrollTimer = window.setTimeout(() => {
        memorialRef.current?.focus({ preventScroll: true });
        memorialRef.current?.scrollIntoView({
          behavior: reduceMotion ? "instant" : "smooth",
          block: "start",
        });
      }, reduceMotion ? 0 : 850);

      return () => window.clearTimeout(scrollTimer);
    }
  }, [state.status]);

  return (
    <main className="occult-page">
      <div className="ritual-glow" aria-hidden="true" />
      <section
        className="ritual-shell"
        aria-labelledby={state.status === "success" ? "last-words-title" : "page-title"}
      >
        <div
          className={`ritual-intro${state.status === "success" ? " ritual-intro-exit" : ""}`}
          aria-hidden={state.status === "success"}
          inert={state.status === "success" ? true : undefined}
        >
          <header className="ritual-header">
            <div className="x-sigil" aria-label="X">
              X
            </div>
            <h1 id="page-title">Summon Their Last Words</h1>
            <p>Enter an X username. See what still lingers.</p>
            <div className="ritual-divider" aria-hidden="true">
              <span />
              <RitualMark />
              <span />
            </div>
          </header>

          <form action={formAction} className="summoning-form">
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
          </form>

          <div className="summoning-response" aria-live="polite">
            {state.status === "error" ? (
              <p className="ritual-message ritual-message-error">
                {state.message}
              </p>
            ) : null}

            {pending ? (
              <p className="ritual-message ritual-message-pending">
                Gathering their last words, writing a farewell, and finding their ghost…
              </p>
            ) : null}
          </div>

          <p className="ritual-footnote">
            Public accounts only <span aria-hidden="true">·</span> Nothing is
            posted to X
          </p>
        </div>

        {state.status === "success" ? (
          <div
            className="memorial-results"
            role="region"
            aria-label="Last words, obituary, and haunting"
            ref={memorialRef}
            tabIndex={-1}
          >
            <MemorialParchments
              memorial={state.memorial}
              displayName={state.displayName}
              username={state.username}
            />
          </div>
        ) : null}
      </section>
    </main>
  );
}
