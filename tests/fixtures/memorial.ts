import type { Memorial, HauntingArtwork, SavedMemorial } from "../../src/lib/memorial-contract";

export const memorial: Memorial = {
  lastWords: "Just one more minor adjustment.",
  obituary: {
    title: "A Life Spent Rearranging the Afterlife",
    epitaph: "Finally, a deadline they could not move.",
    paragraphs: [
      "Morgan died attempting to alphabetize a thunderstorm. The thunderstorm declined to participate in the retrospective.",
      "An optimist by temperament and a menace by spreadsheet, Morgan believed every problem could be solved with a fresh tab.",
      "Their friends remember a generous soul who could turn a five-minute errand into a three-act investigation.",
    ],
    closingLine: "They were survived by a cat who has already rented out the chair and a fern enjoying its first unscheduled afternoon.",
  },
  haunting: {
    location: "The Municipal Department of Unfinished Business",
    paragraphs: [
      "At midnight the filing cabinets rearrange themselves into a system nobody requested.",
      "Visitors hear a faint whisper asking whether this haunting could have been an email.",
    ],
    unfinishedBusiness: "Getting the afterlife to agree on a naming convention.",
  },
};
export const artwork: HauntingArtwork = {
  src: "/images/graveyard/clearing.webp", alt: "A moonlit fictional cemetery",
  width: 1800, height: 1200,
};
export const saved: SavedMemorial = {
  id: "11111111-1111-4111-8111-111111111111", username: "morgan_test",
  displayName: "Morgan Test", epitaph: memorial.obituary.epitaph,
  memorial, hauntingArtwork: artwork, postsAnalyzed: 25,
  headstoneVariant: 0, publishedAt: "2026-10-20T12:00:00.000Z",
};
