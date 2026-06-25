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
  X,
  Check,
  Mail,
  Key,
  User,
} from 'lucide-react';
import Link from 'next/link';

interface AdminUser {
  uid: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  createdAt: string;
  projectCount: number;
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
        <div className="flex items-center gap-2.5 text-slate-400">
          <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium">กำลังโหลด...</span>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) return null;

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-50 to-slate-100/60">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/60 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center justify-center w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-all active:scale-90"
            >
              <ArrowLeft size={16} />
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-sm shadow-violet-200">
                <Shield size={15} className="text-white" />
              </div>
              <h1 className="text-[15px] font-bold text-slate-900 leading-tight">จัดการระบบ</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-400 hidden sm:inline">{user?.name}</span>
            <div className="w-px h-4 bg-slate-200 hidden sm:block" />
            <button
              onClick={signOut}
              className="px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
            >
              ออกจากระบบ
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 space-y-5">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="relative overflow-hidden rounded-xl bg-white border border-slate-200/70 p-5 shadow-sm">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-violet-100/60 to-transparent rounded-bl-full" />
            <div className="relative flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 text-violet-500 mb-0.5">
                  <Users size={16} />
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">ผู้ใช้ทั้งหมด</span>
                </div>
                <p className="text-3xl font-bold text-slate-900 mt-1">{users.filter(u => u.role !== 'admin').length}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                <Users size={18} className="text-violet-600" />
              </div>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">รวมผู้ใช้ทั่วไป (ไม่รวมผู้ดูแล)</p>
          </div>

          <div className="relative overflow-hidden rounded-xl bg-white border border-slate-200/70 p-5 shadow-sm">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-blue-100/60 to-transparent rounded-bl-full" />
            <div className="relative flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 text-blue-500 mb-0.5">
                  <Layout size={16} />
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">โปรเจคทั้งหมด</span>
                </div>
                <p className="text-3xl font-bold text-slate-900 mt-1">{totalProjects}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <Layout size={18} className="text-blue-600" />
              </div>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">รวมทุกโปรเจคในระบบ</p>
          </div>

        </div>

        {error && (
          <div className="flex items-center gap-2.5 rounded-xl bg-red-50 border border-red-200/60 px-4 py-3 shadow-sm">
            <AlertCircle size={15} className="text-red-500 shrink-0" />
            <span className="text-sm font-medium text-red-700">{error}</span>
            <button onClick={() => setError('')} className="ml-auto p-1 text-red-400 hover:text-red-600 hover:bg-red-100 rounded-lg transition-all">
              <X size={14} />
            </button>
          </div>
        )}

        {/* User Management */}
        <div className="rounded-xl bg-white border border-slate-200/70 shadow-sm overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center gap-3 px-5 pt-4 pb-3 border-b border-slate-100">
            <div className="relative flex-1 max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหาผู้ใช้..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100 transition-all"
              />
            </div>
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="flex items-center gap-1.5 rounded-lg bg-violet-500 hover:bg-violet-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm shadow-violet-200 transition-all active:scale-95"
            >
              <UserPlus size={14} />
              เพิ่มผู้ใช้
            </button>
          </div>

          {/* Create User Form */}
          {showCreate && (
            <div className="mx-5 my-3 rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1 bg-violet-100 rounded-lg"><UserPlus size={14} className="text-violet-600" /></div>
                <h3 className="text-xs font-bold text-slate-800">สร้างผู้ใช้ใหม่</h3>
              </div>
              <form onSubmit={handleCreate} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="relative">
                    <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="ชื่อ" required
                      className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-2 text-xs text-slate-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all"
                    />
                  </div>
                  <div className="relative">
                    <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="อีเมล" required
                      className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-2 text-xs text-slate-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all"
                    />
                  </div>
                  <div className="relative">
                    <Key size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="รหัสผ่าน" required minLength={6}
                      className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-2 text-xs text-slate-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all"
                    />
                  </div>
                  <select value={newRole} onChange={(e) => setNewRole(e.target.value as 'admin' | 'user')}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all"
                  >
                    <option value="user">ผู้ใช้ทั่วไป</option>
                    <option value="admin">ผู้ดูแลระบบ</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button type="button" onClick={() => setShowCreate(false)}
                    className="rounded-lg px-3.5 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 transition-all"
                  >
                    ยกเลิก
                  </button>
                  <button type="submit"
                    className="flex items-center gap-1 rounded-lg bg-violet-500 hover:bg-violet-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-all active:scale-95"
                  >
                    <Check size={13} />
                    สร้าง
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* User List Header */}
          <div className="hidden sm:flex items-center gap-3 px-5 py-2 bg-slate-50/80 border-b border-slate-100">
            <div className="w-8 shrink-0" />
            <div className="flex-1 grid grid-cols-2 gap-2">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">ชื่อผู้ใช้</span>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">อีเมล</span>
            </div>
            <div className="w-[168px] shrink-0" />
          </div>

          {/* User Rows */}
          <div className="divide-y divide-slate-100">
            {filtered.map((u) => (
              <div key={u.uid} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/80 transition-colors group">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm ${u.role === 'admin' ? 'bg-gradient-to-br from-violet-500 to-purple-600' : 'bg-gradient-to-br from-slate-400 to-slate-500'}`}>
                  {u.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-2 items-center">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-semibold text-slate-900 truncate">{u.name}</span>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">{u.projectCount}</span>
                    {u.role === 'admin' && (
                      <span className="hidden sm:inline shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-600">
                        Admin
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 truncate">{u.email}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <select
                    value={u.role}
                    onChange={(e) => handleRoleChange(u.uid, e.target.value as 'admin' | 'user')}
                    className="w-28 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all cursor-pointer"
                  >
                    <option value="user">ผู้ใช้</option>
                    <option value="admin">ผู้ดูแล</option>
                  </select>
                  <button
                    onClick={() => handleDelete(u.uid)}
                    disabled={u.uid === user.uid}
                    className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all opacity-0 group-hover:opacity-100 sm:opacity-100"
                    title="ลบผู้ใช้"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="px-5 py-10 text-center">
                <Users size={24} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm text-slate-400 font-medium">ไม่พบผู้ใช้</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
