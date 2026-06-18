'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  Shield,
  Users,
  UserPlus,
  Trash2,
  ArrowLeft,
  Search,
  AlertCircle,
  Layout,
} from 'lucide-react';
import Link from 'next/link';

interface AdminUser {
  uid: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  createdAt: string;
}

export default function AdminPage() {
  const { user, loading, isAdmin, signOut } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [fetching, setFetching] = useState(true);
  const [totalProjects, setTotalProjects] = useState(0);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<'user' | 'admin'>('user');

  const fetchUsers = useCallback(async () => {
    try {
      const [usersRes, projectsRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/projects'),
      ]);
      if (!usersRes.ok) throw new Error('Failed to fetch users');
      const usersData = await usersRes.json();
      setUsers(usersData.users || []);
      if (projectsRes.ok) {
        const projData = await projectsRes.json();
        setTotalProjects((projData.projects || []).length);
      }
    } catch {
      setError('โหลดข้อมูลไม่สำเร็จ');
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    if (!isAdmin) {
      router.push('/');
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchUsers();
  }, [loading, user, isAdmin, router, fetchUsers]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail, password: newPassword, name: newName, role: newRole }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'สร้างผู้ใช้ไม่สำเร็จ');
        return;
      }
      setShowCreate(false);
      setNewEmail('');
      setNewPassword('');
      setNewName('');
      setNewRole('user');
      fetchUsers();
    } catch {
      setError('เกิดข้อผิดพลาด');
    }
  };

  const handleDelete = async (uid: string) => {
    if (!confirm('แน่ใจว่าต้องการลบผู้ใช้นี้?')) return;
    try {
      const res = await fetch(`/api/admin/users/${uid}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'ลบไม่สำเร็จ');
        return;
      }
      fetchUsers();
    } catch {
      setError('เกิดข้อผิดพลาด');
    }
  };

  const handleRoleChange = async (uid: string, role: 'admin' | 'user') => {
    try {
      await fetch(`/api/admin/users/${uid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      fetchUsers();
    } catch {
      setError('เปลี่ยนบทบาทไม่สำเร็จ');
    }
  };

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  if (loading || fetching) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <div className="text-sm text-slate-400">กำลังโหลด...</div>
      </div>
    );
  }

  if (!user || !isAdmin) return null;

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <div className="h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500" />

      <header className="flex items-center justify-between px-5 h-14 bg-white border-b border-slate-100">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center justify-center w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-all active:scale-90"
          >
            <ArrowLeft size={16} />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm">
              <Shield size={15} className="text-white" />
            </div>
            <h1 className="text-[15px] font-bold text-slate-900 leading-tight">จัดการระบบ</h1>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          {user?.name}
          <button
            onClick={signOut}
            className="px-3.5 py-2 text-xs font-semibold text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
          >
            ออกจากระบบ
          </button>
        </div>
      </header>

      <div className="flex-1 p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white p-4 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2.5 text-violet-500 mb-1">
              <Users size={16} />
              <span className="text-[11px] font-semibold text-slate-500">ผู้ใช้ทั้งหมด</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{users.length}</p>
          </div>
          <div className="rounded-xl bg-white p-4 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2.5 text-blue-500 mb-1">
              <Layout size={16} />
              <span className="text-[11px] font-semibold text-slate-500">โปรเจคทั้งหมด</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{totalProjects}</p>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600">
            <AlertCircle size={15} />
            {error}
            <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600">ปิด</button>
          </div>
        )}

        <div className="rounded-xl bg-white border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 px-4 pt-4 pb-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหาผู้ใช้..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100"
              />
            </div>
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="flex items-center gap-1.5 rounded-lg bg-violet-500 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-600 transition-all active:scale-95"
            >
              <UserPlus size={14} />
              เพิ่มผู้ใช้
            </button>
          </div>

          {showCreate && (
            <form onSubmit={handleCreate} className="mx-4 mb-3 rounded-xl border border-violet-200 bg-violet-50 p-3 space-y-2.5">
              <div className="grid grid-cols-2 gap-2.5">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="ชื่อ"
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-violet-400"
                />
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="อีเมล"
                  required
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-violet-400"
                />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="รหัสผ่าน"
                  required
                  minLength={6}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-violet-400"
                />
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as 'admin' | 'user')}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-violet-400"
                >
                  <option value="user">ผู้ใช้</option>
                  <option value="admin">ผู้ดูแล</option>
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-200 transition-all"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-violet-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-600 transition-all active:scale-95"
                >
                  สร้าง
                </button>
              </div>
            </form>
          )}

          <div className="divide-y divide-slate-100">
            {filtered.map((u) => (
              <div key={u.uid} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${u.role === 'admin' ? 'bg-violet-500' : 'bg-slate-400'}`}>
                  {u.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900 truncate">{u.name}</span>
                    {u.role === 'admin' && (
                      <span className="shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-600">
                        Admin
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 truncate">{u.email}</p>
                </div>

                <select
                  value={u.role}
                  onChange={(e) => handleRoleChange(u.uid, e.target.value as 'admin' | 'user')}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-violet-400"
                >
                  <option value="user">ผู้ใช้</option>
                  <option value="admin">ผู้ดูแล</option>
                </select>

                <button
                  onClick={() => handleDelete(u.uid)}
                  disabled={u.uid === user.uid}
                  className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  title="ลบผู้ใช้"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-slate-400">ไม่พบผู้ใช้</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
