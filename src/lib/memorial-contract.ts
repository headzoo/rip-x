import { z } from "zod";

const ObituarySchema = z.object({
  title: z.string(),
  epitaph: z.string(),
  paragraphs: z.array(z.string()).length(3).describe(
    "Three comic remembrance paragraphs. The very first sentence states the subject's absurd fictional cause of death, driven by their personality. No ghost activity or haunting scenes.",
  ),
  closingLine: z.string().describe(
    'The obituary\'s final sentence, beginning exactly "They were survived by" and including funny invented pet and houseplant survivors whose reactions reflect the subject\'s personality.',
  ),
});

export const MemorialSchema = z.object({
  lastWords: z.string().describe("A short, invented final utterance in the subject's own voice."),
  obituary: ObituarySchema,
  haunting: z.object({
    location: z.string().describe("A specific invented setting, used as the haunting's heading."),
    paragraphs: z.array(z.string()).length(2),
    unfinishedBusiness: z.string().describe("The comic unresolved impulse keeping this ghost here."),
  }),
});

export type Memorial = z.infer<typeof MemorialSchema>;

export const ArtworkSchema = z.object({
  src: z.string(),
  alt: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});
export type HauntingArtwork = z.infer<typeof ArtworkSchema>;

export interface GraveSummary {
  id: string;
  username: string;
  displayName: string;
  epitaph: string;
  headstoneVariant: number;
  publishedAt: string;
}

export interface SavedMemorial extends GraveSummary {
  memorial: Memorial;
  hauntingArtwork: HauntingArtwork;
  postsAnalyzed: number;
}

export interface GravePage {
  graves: GraveSummary[];
  hasMore: boolean;
  page: number;
}
