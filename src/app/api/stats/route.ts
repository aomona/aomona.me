import { getStatsApiResponse } from "@/lib/statsApi";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return Response.json(await getStatsApiResponse());
}
