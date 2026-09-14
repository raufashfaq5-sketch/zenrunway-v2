import { NextResponse } from "next/server";
import { getUSDToPKRRate } from "@/lib/fxService";

export async function GET() {
  try {
    const fxData = await getUSDToPKRRate();
    return NextResponse.json({
      success: true,
      ...fxData,
    });
  } catch (err: unknown) {
    console.error("Error in /api/fx-rate handler:", err);
    return NextResponse.json(
      {
        success: false,
        rate: 278,
        tier: 3,
        source: "Static Fallback Baseline",
        updatedAt: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
