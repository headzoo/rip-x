import { getPublicMemorial } from "@/lib/memorial-repository";
import { connection } from "next/server";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await connection();
  try {
    const memorial = await getPublicMemorial((await params).id);
    return Response.json(memorial ?? { error: "This memorial is not available." }, {
      status: memorial ? 200 : 404, headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json({ error: "The archive is temporarily unavailable. Please try again." }, {
      status: 503, headers: { "Cache-Control": "no-store" },
    });
  }
}
