import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminDb } from '@/lib/firebase-admin';

function parseSession(session: string | undefined): { uid: string; role?: string } | null {
  if (!session) return null;
  try {
    return JSON.parse(Buffer.from(session, 'base64').toString('utf-8'));
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const user = parseSession(cookieStore.get('session')?.value);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const adminDb = await getAdminDb();
    let projects;

    if (user.role === 'admin') {
      const snapshot = await adminDb.collectionGroup('projects').get();
      projects = snapshot.docs.map((d: any) => d.data());
    } else {
      const snapshot = await adminDb.collection('users').doc(user.uid).collection('projects').get();
      projects = snapshot.docs.map((d: any) => d.data());
    }

    return NextResponse.json({ projects });
  } catch (e) {
    console.error('[Projects GET Error]', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const user = parseSession(cookieStore.get('session')?.value);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const project = {
      ownerId: user.uid,
      ...body,
      id: body.id || `proj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    };

    const adminDb = await getAdminDb();
    await adminDb.collection('users').doc(user.uid).collection('projects').doc(project.id).set(project);

    return NextResponse.json({ project });
  } catch (e) {
    console.error('[Projects POST Error]', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 });
  }
}
