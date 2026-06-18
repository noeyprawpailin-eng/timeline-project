import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import type { Firestore, DocumentReference, DocumentData } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase-admin';

function parseSession(session: string | undefined): { uid: string; role?: string } | null {
  if (!session) return null;
  try {
    return JSON.parse(Buffer.from(session, 'base64').toString('utf-8'));
  } catch {
    return null;
  }
}

async function findProjectById(adminDb: Firestore, id: string): Promise<{ ref: DocumentReference; data: DocumentData } | null> {
  const snapshot = await adminDb.collectionGroup('projects').where('id', '==', id).limit(1).get();
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { ref: doc.ref, data: doc.data() };
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  const user = parseSession(cookieStore.get('session')?.value);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const adminDb = getAdminDb();

  if (user.role === 'admin') {
    const found = await findProjectById(adminDb, id);
    if (!found) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ project: found.data });
  }

  const doc = await adminDb.collection('users').doc(user.uid).collection('projects').doc(id).get();
  if (!doc.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ project: doc.data() });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  const user = parseSession(cookieStore.get('session')?.value);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const adminDb = getAdminDb();

  if (user.role === 'admin') {
    const found = await findProjectById(adminDb, id);
    if (!found) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    await found.ref.set({ ...body, ownerId: found.data.ownerId || user.uid });
  } else {
    await adminDb.collection('users').doc(user.uid).collection('projects').doc(id).set({ ...body, ownerId: user.uid });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  const user = parseSession(cookieStore.get('session')?.value);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const adminDb = getAdminDb();

  if (user.role === 'admin') {
    const found = await findProjectById(adminDb, id);
    if (!found) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    await found.ref.delete();
  } else {
    await adminDb.collection('users').doc(user.uid).collection('projects').doc(id).delete();
  }

  return NextResponse.json({ success: true });
}
