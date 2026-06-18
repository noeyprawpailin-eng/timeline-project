import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminDb } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'กรุณากรอกอีเมลและรหัสผ่าน' }, { status: 400 });
    }

    const adminDb = getAdminDb();
    const snapshot = await adminDb
      .collection('users')
      .where('email', '==', email.toLowerCase().trim())
      .limit(1)
      .get();

    if (snapshot.empty) {
      return NextResponse.json({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' }, { status: 401 });
    }

    const userData = snapshot.docs[0].data();
    if (userData.password !== password) {
      return NextResponse.json({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' }, { status: 401 });
    }

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
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return NextResponse.json({
      user: { uid: userData.uid, email: userData.email, name: userData.name, role: userData.role },
    });
  } catch {
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}
