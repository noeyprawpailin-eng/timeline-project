import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase-admin';

const DOC_PATH = 'config/global';

export async function GET() {
  try {
    const adminDb = getAdminDb();
    const doc = await adminDb.doc(DOC_PATH).get();
    const data = doc.data();
    return NextResponse.json({ holidays: data?.holidays || {} });
  } catch {
    return NextResponse.json({ holidays: {} });
  }
}

export async function POST(request: Request) {
  try {
    const { date, name } = await request.json();
    if (!date || !name) {
      return NextResponse.json({ error: 'date and name required' }, { status: 400 });
    }
    const adminDb = getAdminDb();
    await adminDb.doc(DOC_PATH).set(
      { holidays: { [date]: name } },
      { merge: true }
    );
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to add holiday' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    if (!date) {
      return NextResponse.json({ error: 'date query param required' }, { status: 400 });
    }
    const adminDb = getAdminDb();
    await adminDb.doc(DOC_PATH).update({
      [`holidays.${date}`]: FieldValue.delete(),
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete holiday' }, { status: 500 });
  }
}
