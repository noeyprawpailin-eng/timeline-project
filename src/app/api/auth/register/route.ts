import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminDb } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    const { email, password, name } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'กรุณากรอกอีเมลและรหัสผ่าน' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' }, { status: 400 });
    }

    const adminDb = await getAdminDb();
    const normalEmail = email.toLowerCase().trim();

    const existing = await adminDb
      .collection('users')
      .where('email', '==', normalEmail)
      .limit(1)
      .get();

    if (!existing.empty) {
      return NextResponse.json({ error: 'อีเมลนี้ถูกใช้แล้ว' }, { status: 409 });
    }

    const allUsers = await adminDb.collection('users').limit(1).get();
    const isFirstUser = allUsers.empty;

    const uid = `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const userData = {
      uid,
      email: normalEmail,
      password,
      name: (name || email.split('@')[0]).trim(),
      role: isFirstUser ? 'admin' : 'user',
      createdAt: new Date().toISOString(),
    };

    await adminDb.collection('users').doc(uid).set(userData);

    const cookieValue = Buffer.from(
      JSON.stringify({
        uid: userData.uid,
        email: userData.email,
        name: userData.name,
        role: userData.role,
      })
    ).toString('base64');

    const cookieStore = await cookies();
    cookieStore.set('session', cookieValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return NextResponse.json({
      user: { uid: userData.uid, email: userData.email, name: userData.name, role: userData.role },
    });
  } catch (e) {
    console.error('[Register Error]', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 });
  }
}
