import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

async function findProjectById(adminDb: any, id: string): Promise<{ data: any } | null> {
  const users = await adminDb.collection('users').get();
  for (const userDoc of users.docs) {
    const projectDoc = await userDoc.ref.collection('projects').doc(id).get();
    if (projectDoc.exists) {
      return { data: projectDoc.data() };
    }
  }
  return null;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const adminDb = await getAdminDb();
    const found = await findProjectById(adminDb, id);
    if (!found) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ project: found.data });
  } catch (e) {
    console.error('[Public Project GET Error]', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 });
  }
}
