import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminDb } from '@/lib/firebase-admin';

function parseSession(session: string | undefined) {
  if (!session) return null;
  try {
    return JSON.parse(Buffer.from(session, 'base64').toString('utf-8')) as {
      uid: string; email: string; name: string; role: string;
    };
  } catch {
    return null;
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ uid: string }> }) {
  const cookieStore = await cookies();
  const user = parseSession(cookieStore.get('session')?.value);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { uid } = await params;
  const { role, name } = await request.json();
  const updates: Record<string, string> = {};
  if (role) updates.role = role;
  if (name) updates.name = name;

  const adminDb = getAdminDb();
  await adminDb.collection('users').doc(uid).update(updates);
  return NextResponse.json({ success: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ uid: string }> }) {
  const cookieStore = await cookies();
  const user = parseSession(cookieStore.get('session')?.value);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { uid } = await params;
  if (uid === user.uid) {
    return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });
  }

  const adminDb = getAdminDb();
  await adminDb.collection('users').doc(uid).delete();
  return NextResponse.json({ success: true });
}
