import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { initializeApp, getApps, cert } = await import("firebase-admin/app");
    const { getFirestore } = await import("firebase-admin/firestore");
    const keyExists = !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    const keyLen = process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.length || 0;
    const firstChars = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
      ? process.env.FIREBASE_SERVICE_ACCOUNT_KEY.slice(0, 50)
      : "none";
    let initMsg = "not tried";
    try {
      JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || "{}");
      initMsg = "JSON parsed OK, apps=" + getApps().length;
    } catch (e) {
      initMsg = "JSON parse error: " + (e instanceof Error ? e.message : String(e));
    }
    return NextResponse.json({ keyExists, keyLen, firstChars, initMsg });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
