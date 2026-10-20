import type { CSSProperties } from "react";

import styles from "./summoning-ghosts.module.css";

// Normalized viewport positions keep every flight inside screens of any size.
// Different routes and phases keep the six apparitions from moving in unison.
const apparitions = [
  { route: [[0.02, 0.12], [0.24, 0.6], [0.78, 0.36], [0.52, 0.04]], duration: 34, phase: -3, breath: 2.4, opacity: 0.6, scale: 1, mirror: 1 },
  { route: [[0.82, 0.08], [0.53, 0.33], [0.91, 0.78], [0.64, 0.61]], duration: 39, phase: -8, breath: 2.9, opacity: 0.51, scale: 0.93, mirror: -1 },
  { route: [[0.06, 0.72], [0.4, 0.92], [0.65, 0.57], [0.14, 0.4]], duration: 43, phase: -5, breath: 2.65, opacity: 0.57, scale: 1.06, mirror: 1 },
  { route: [[0.87, 0.84], [0.67, 0.54], [0.31, 0.8], [0.6, 0.96]], duration: 37, phase: -2, breath: 3.1, opacity: 0.64, scale: 1.02, mirror: -1 },
  { route: [[0.43, 0.46], [0.14, 0.23], [0.53, 0.06], [0.81, 0.53]], duration: 46, phase: -11, breath: 2.75, opacity: 0.45, scale: 0.96, mirror: -1 },
  { route: [[0.58, 0.95], [0.88, 0.53], [0.42, 0.7], [0.11, 0.92]], duration: 41, phase: -7, breath: 3.3, opacity: 0.55, scale: 1, mirror: 1 },
] as const;

export function SummoningGhosts({ active }: { active: boolean }) {
  return (
    <div className={styles.ghosts} data-active={active} aria-hidden="true">
      {apparitions.map((ghost, index) => {
        const variables = {
          "--flight-duration": `${ghost.duration}s`,
          "--flight-phase": `${ghost.phase}s`,
          "--breath-duration": `${ghost.breath}s`,
          "--breath-phase": `${-index * 0.43}s`,
          "--ghost-opacity": ghost.opacity,
          "--ghost-scale": ghost.scale,
          "--ghost-mirror": ghost.mirror,
          ...Object.fromEntries(ghost.route.flatMap(([x, y], point) => [
            [`--x${point}`, x],
            [`--y${point}`, y],
          ])),
        } as CSSProperties;

        return (
          <div className={styles.flight} style={variables} key={index}>
            <div className={styles.apparition}>
              <div className={styles.sway}>
                <div className={styles.sprite} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
