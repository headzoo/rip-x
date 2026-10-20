import { listPublicMemorials } from "@/lib/memorial-repository";
import { parseGraveyardQuery } from "@/lib/graveyard-policy";
import { connection } from "next/server";

export async function GET(request: Request) {
  // Keep request-time database reads out of build/prerender, including errors.
  await connection();
  try {
    const page = await listPublicMemorials(parseGraveyardQuery(new URL(request.url).searchParams));
    return Response.json(page, { headers: { "Cache-Control": "no-store" } });
  } catch {
    console.warn("[graveyard] Listing unavailable.");
    return Response.json({ error: "The graveyard gates are temporarily closed. Please try again." }, {
      status: 503, headers: { "Cache-Control": "no-store" },
    });
  }
}
