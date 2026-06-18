import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  const session = cookieStore.get('session')?.value;

  if (!session) {
    return NextResponse.json({ user: null });
  }

  try {
    const data = JSON.parse(Buffer.from(session, 'base64').toString('utf-8'));
    return NextResponse.json({
      user: { uid: data.uid, email: data.email, name: data.name, role: data.role },
    });
  } catch {
    cookieStore.delete('session');
    return NextResponse.json({ user: null });
  }
}
