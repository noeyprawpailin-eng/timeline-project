'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogIn, Eye, EyeOff, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const { refreshAuth } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'เข้าสู่ระบบไม่สำเร็จ');
        return;
      }

      await refreshAuth();
      router.push('/');
    } catch {
      setError('เกิดข้อผิดพลาด กรุณาลองอีกครั้ง');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md">
            <LogIn size={20} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">เข้าสู่ระบบ</h1>
          <p className="mt-1 text-sm text-slate-500">ระบบบริหารโครงการ Timeline</p>
        </div>

        <form onSubmit={handleLogin} className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600">
              <AlertCircle size={15} />
              {error}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">อีเมล</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              required
              autoFocus
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">รหัสผ่าน</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 pr-10 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:from-blue-600 hover:to-indigo-700 disabled:opacity-60 transition-all active:scale-[0.98]"
          >
            {isLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-slate-400">
          ยังไม่มีบัญชี?{' '}
          <Link href="/register" className="font-semibold text-blue-500 hover:text-blue-600">
            ลงทะเบียน
          </Link>
        </p>
      </div>
    </div>
  );
}
