"use client";

import { useEffect, useRef, type ReactNode } from "react";
import styles from "./graveyard.module.css";

export function MemorialDialog({ children, onClose }: { children: ReactNode; onClose(): void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current!;
    const previous = document.activeElement as HTMLElement | null;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    element.showModal();
    return () => {
      element.close();
      document.body.style.overflow = oldOverflow;
      previous?.focus({ preventScroll: true });
    };
  }, []);

  return (
    <dialog ref={dialog} className={styles.dialog} aria-label="Fictional memorial"
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className={styles.dialogInner}>
        <div className={styles.dialogToolbar}>
          <span>A life, allegedly.</span>
          <button type="button" autoFocus onClick={onClose}>Close memorial ×</button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
