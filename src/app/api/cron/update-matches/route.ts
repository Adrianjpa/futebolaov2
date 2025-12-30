import { NextResponse } from "next/server";
import { syncMatchesFromExternalApi } from "@/lib/sync-service";

export async function GET(request: Request) {
    // 1. Security Check
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const result = await syncMatchesFromExternalApi();

        if (!result.success) {
            return NextResponse.json(result, { status: 500 });
        }

        return NextResponse.json(result);

    } catch (error: any) {
        console.error("Cron Route Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
