import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

const DOC_PATH = 'config/global';

export async function GET() {
  try {
    const adminDb = await getAdminDb();
    const doc = await adminDb.doc(DOC_PATH).get();
    const data = doc.data();
    return NextResponse.json({ holidays: data?.holidays || {} });
  } catch (e) {
    console.error('[Holidays GET Error]', e);
    return NextResponse.json({ holidays: {} });
  }
}

export async function POST(request: Request) {
  try {
    const { date, name } = await request.json();
    if (!date || !name) {
      return NextResponse.json({ error: 'date and name required' }, { status: 400 });
    }
    const adminDb = await getAdminDb();
    await adminDb.doc(DOC_PATH).set(
      { holidays: { [date]: name } },
      { merge: true }
    );
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[Holidays POST Error]', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed to add holiday' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    if (!date) {
      return NextResponse.json({ error: 'date query param required' }, { status: 400 });
    }
    const adminDb = await getAdminDb();
    const { FieldValue } = await import('firebase-admin/firestore');
    await adminDb.doc(DOC_PATH).update({
      [`holidays.${date}`]: FieldValue.delete(),
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[Holidays DELETE Error]', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed to delete holiday' }, { status: 500 });
  }
}
