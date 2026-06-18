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

export async function GET() {
  try {
    const cookieStore = await cookies();
    const user = parseSession(cookieStore.get('session')?.value);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const adminDb = await getAdminDb();
    const snapshot = await adminDb.collection('users').orderBy('createdAt', 'asc').get();
    const users = snapshot.docs.map((d: any) => {
      const data = d.data();
      return { uid: data.uid, email: data.email, name: data.name, role: data.role, createdAt: data.createdAt };
    });

    return NextResponse.json({ users });
  } catch (e) {
    console.error('[Admin Users GET Error]', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const user = parseSession(cookieStore.get('session')?.value);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { email, password, name, role } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'email and password required' }, { status: 400 });
    }

    const adminDb = await getAdminDb();
    const uid = `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const newUser = {
      uid,
      email: email.toLowerCase().trim(),
      password,
      name: name || email.split('@')[0],
      role: role || 'user',
      createdAt: new Date().toISOString(),
    };

    await adminDb.collection('users').doc(uid).set(newUser);
    return NextResponse.json({
      user: { uid: newUser.uid, email: newUser.email, name: newUser.name, role: newUser.role },
    });
  } catch (e) {
    console.error('[Admin Users POST Error]', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed to create user' }, { status: 500 });
  }
}
