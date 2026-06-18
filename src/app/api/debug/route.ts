import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  try {
    const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (action === "init") {
      const { initializeApp, getApps, cert } = await import("firebase-admin/app");
      const { getFirestore } = await import("firebase-admin/firestore");
      let app = getApps()[0];
      if (!app) {
        app = initializeApp({ credential: cert(JSON.parse(key || "{}")) });
      }
      const db = getFirestore(app);
      const test = await db.collection("users").limit(1).get();
      return NextResponse.json({
        ok: true,
        apps: getApps().length,
        docs: test.size,
        msg: "Firebase init OK, " + test.size + " docs found",
      });
    }
    return NextResponse.json({ keyExists: !!key, keyLen: key?.length || 0 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e), stack: e instanceof Error ? (e.stack || "").split("\n").slice(0, 5).join(" | ") : "" },
      { status: 500 }
    );
  }
}
