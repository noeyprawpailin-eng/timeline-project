'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Briefcase, Calendar, List, Search, Shield, LogOut, Users, Check, X } from 'lucide-react';
import { useProjectStore } from '../store/useProjectStore';
import { useAuth } from '@/contexts/AuthContext';
import { ProjectCard } from './ProjectCard';
import type { Assignee } from '../../../types/project';

export const ProjectDashboard: React.FC = () => {
  const { projects, createProject, globalHolidays, addGlobalHoliday, removeGlobalHoliday, loading, error, clearError } = useProjectStore();
  const { isAdmin, signOut } = useAuth();
  const router = useRouter();
  const [projectName, setProjectName] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [holidayDate, setHolidayDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [holidayName, setHolidayName] = useState('');
  const [showHolidaysList, setShowHolidaysList] = useState(false);
  const [editingHolidayDate, setEditingHolidayDate] = useState<string | null>(null);
  const [editingHolidayName, setEditingHolidayName] = useState('');
  const [editingHolidayNewDate, setEditingHolidayNewDate] = useState('');
  const [newAssigneeName, setNewAssigneeName] = useState('');
  const [newAssigneeColor, setNewAssigneeColor] = useState('#3b82f6');
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const ASSIGNEE_COLORS = ['#3b82f6','#10b981','#ef4444','#f97316','#eab308','#8b5cf6','#ec4899','#06b6d4','#6b7280','#6366f1'];

  const formatHolidayDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-');
    return `${parseInt(d)}/${m}/${parseInt(y) + 543}`;
  };

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) return;
    createProject(projectName, startDate, assignees.length > 0 ? assignees : undefined);
    setProjectName('');
    setAssignees([]);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)]">
        <header className="bg-white/95 backdrop-blur-sm border-b border-slate-200/70 card-shadow">
          <div className="max-w-6xl mx-auto px-6 h-12 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-blue-600 text-white rounded-lg shadow-sm"><Briefcase size={16} /></div>
              <h1 className="text-base font-extrabold text-slate-900 tracking-tight">Timeline โปรเจค</h1>
            </div>
          </div>
        </header>
        <div className="flex items-center justify-center py-20 text-sm text-slate-400">กำลังโหลดข้อมูล...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Top Header Bar */}
      <header className="bg-white/95 backdrop-blur-sm border-b border-slate-200/70 card-shadow">
        <div className="max-w-6xl mx-auto px-6 h-12 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-blue-600 text-white rounded-lg shadow-sm">
              <Briefcase size={16} />
            </div>
            <h1 className="text-base font-extrabold text-slate-900 tracking-tight">Timeline โปรเจค</h1>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-100 px-3 py-1.5 rounded-full">
              <span className="font-bold text-slate-600">{projects.length}</span>
              <span>โปรเจค</span>
            </div>
            {isAdmin && (
              <button
                onClick={() => router.push('/admin')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-all"
                title="จัดการระบบ"
              >
                <Shield size={14} />
                <span className="hidden sm:inline">จัดการระบบ</span>
              </button>
            )}
            <button
              onClick={signOut}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
              title="ออกจากระบบ"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div className="max-w-6xl mx-auto px-6 pt-3">
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-start gap-2">
            <p className="flex-1 text-xs text-red-700 font-mono whitespace-pre-wrap break-words">{error}</p>
            <button onClick={clearError} className="text-red-400 hover:text-red-600 font-bold leading-none">&times;</button>
          </div>
        </div>
      )}
      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-5 space-y-5">
        {/* Two-column: Create Project + Manage Holidays */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Create New Project */}
          <div className="bg-white rounded-xl border border-slate-200/80 card-shadow card-shadow-hover">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-100">
              <div className="p-1 bg-blue-50 rounded"><Plus size={14} className="text-blue-600" /></div>
              <h2 className="text-sm font-bold text-slate-800">สร้างโปรเจคใหม่</h2>
            </div>
            <form onSubmit={handleCreate} className="p-5">
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">ชื่อโปรเจค</label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="z.B. ปรับปรุงเว็บไซต์"
                    className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">ผู้รับผิดชอบ</label>
                  <div className="flex items-center gap-2">
                    <input type="text" value={newAssigneeName} onChange={(e) => setNewAssigneeName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (newAssigneeName.trim()) { if (!assignees.some(a => a.name === newAssigneeName.trim())) { setAssignees([...assignees, { name: newAssigneeName.trim(), color: newAssigneeColor }]); } setNewAssigneeName(''); } } }}
                      placeholder="ชื่อผู้รับผิดชอบ"
                      className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                    />
                    <div className="flex items-center gap-0.5">
                      {ASSIGNEE_COLORS.map(c => (
                        <button key={c} type="button" onClick={() => setNewAssigneeColor(c)}
                          className={`w-4 h-4 rounded-full border ${newAssigneeColor === c ? 'border-slate-800 scale-110' : 'border-transparent'}`}
                          style={{ background: c }} />
                      ))}
                    </div>
                    <button type="button" onClick={() => { if (newAssigneeName.trim()) { if (!assignees.some(a => a.name === newAssigneeName.trim())) { setAssignees([...assignees, { name: newAssigneeName.trim(), color: newAssigneeColor }]); } setNewAssigneeName(''); } }}
                      disabled={!newAssigneeName.trim()}
                      className="px-2.5 py-2 bg-violet-500 disabled:opacity-40 text-white text-xs font-bold rounded-lg hover:bg-violet-600 transition-all">เพิ่ม</button>
                  </div>
                  {assignees.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {assignees.map(a => (
                        <span key={a.name} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white" style={{ background: a.color }}>
                          {a.name}
                          <button type="button" onClick={() => setAssignees(assignees.filter(x => x.name !== a.name))} className="text-white/70 hover:text-white">&times;</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-end gap-3">
                  <div className="flex-1 flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">วันที่เริ่ม</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!projectName.trim()}
                    className="h-[42px] px-5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold rounded-lg transition-all active:scale-95 whitespace-nowrap"
                  >
                    สร้าง
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Manage Holidays */}
          <div className="bg-white rounded-xl border border-slate-200/80 card-shadow card-shadow-hover">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-100">
              <div className="p-1 bg-amber-50 rounded"><Calendar size={14} className="text-amber-600" /></div>
              <h2 className="text-sm font-bold text-slate-800">จัดการวันหยุด</h2>
              <span className="ml-auto text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                {Object.keys(globalHolidays).length} วัน
              </span>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex items-end gap-3">
                <div className="flex-1 flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">วันที่</label>
                  <input 
                    type="date" 
                    value={holidayDate} 
                    onChange={(e) => setHolidayDate(e.target.value)} 
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all" 
                  />
                </div>
                <div className="flex-[2] flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">ชื่อวันหยุด</label>
                  <input
                    type="text"
                    value={holidayName}
                    onChange={(e) => setHolidayName(e.target.value)}
                    placeholder="z.B. วันลาพักผ่อน"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                  />
                </div>
                <button
                  onClick={() => {
                    if (!holidayName.trim() || !holidayDate) return;
                    addGlobalHoliday(holidayDate, holidayName);
                    setHolidayName('');
                    setHolidayDate(new Date().toISOString().split('T')[0]);
                  }}
                  disabled={!holidayName.trim()}
                  className="h-[42px] px-5 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold rounded-lg transition-all active:scale-95 whitespace-nowrap"
                >
                  เพิ่ม
                </button>
              </div>

              {/* Holidays list toggle */}
              {Object.keys(globalHolidays).length > 0 && (
                <>
                  <button
                    onClick={() => setShowHolidaysList(!showHolidaysList)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    <List size={14} />
                    <span>{showHolidaysList ? 'ซ่อน' : 'แสดง'}วันหยุดทั้งหมด</span>
                  </button>

                  {showHolidaysList && (
                    <div className="max-h-52 overflow-y-auto space-y-1.5 pl-1">
                      {Object.entries(globalHolidays).sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime()).map(([date, name]) => (
                        <div key={date} className="flex items-center justify-between py-1.5 px-2.5 bg-slate-50 rounded-md group">
                          {editingHolidayDate === date ? (
                            <div className="flex items-center gap-1.5 flex-1">
                              <input type="date" value={editingHolidayNewDate}
                                onChange={(e) => setEditingHolidayNewDate(e.target.value)}
                                className="w-32 px-2 py-1 bg-white border border-amber-200 rounded text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                              />
                              <input type="text" value={editingHolidayName}
                                onChange={(e) => setEditingHolidayName(e.target.value)}
                                onKeyDown={async (e) => {
                                  if (e.key === 'Enter') {
                                    const oldDate = date;
                                    const newDate = editingHolidayNewDate;
                                    const newName = editingHolidayName.trim();
                                    if (newName && newDate && (newDate !== oldDate || newName !== name)) {
                                      try {
                                        await removeGlobalHoliday(oldDate);
                                        await addGlobalHoliday(newDate, newName);
                                      } catch (err) {
                                        console.error('Failed to update holiday', err);
                                      }
                                    }
                                    setEditingHolidayDate(null);
                                  }
                                  if (e.key === 'Escape') setEditingHolidayDate(null);
                                }}
                                className="flex-1 px-2 py-1 bg-white border border-amber-200 rounded text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                                autoFocus
                              />
                              <button onClick={async () => {
                                const oldDate = date;
                                const newDate = editingHolidayNewDate;
                                const newName = editingHolidayName.trim();
                                if (newName && newDate && (newDate !== oldDate || newName !== name)) {
                                  try {
                                    await removeGlobalHoliday(oldDate);
                                    await addGlobalHoliday(newDate, newName);
                                  } catch (err) {
                                    console.error('Failed to update holiday', err);
                                  }
                                }
                                setEditingHolidayDate(null);
                              }} className="p-1 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors">
                                <Check size={14} />
                              </button>
                              <button onClick={() => setEditingHolidayDate(null)} className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors">
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-xs flex-1 cursor-pointer"
                              onClick={() => { setEditingHolidayDate(date); setEditingHolidayName(name); setEditingHolidayNewDate(date); }}>
                              <span className="font-medium text-slate-500">{formatHolidayDate(date)}</span>
                              <span className="text-slate-700 font-medium">{name}</span>
                            </div>
                          )}
                          {editingHolidayDate !== date && (
                            <button
                              onClick={() => removeGlobalHoliday(date)}
                              className="text-red-400 opacity-0 group-hover:opacity-100 hover:text-red-600 transition-all text-xs font-bold leading-none"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Projects Section */}
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-gradient-to-br from-slate-800 to-slate-700 text-white rounded-lg shadow-sm">
                <Briefcase size={15} />
              </div>
              <h2 className="text-base font-extrabold text-slate-900">โปรเจคทั้งหมด</h2>
            </div>
            {projects.length > 0 && (
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ค้นหาโปรเจค..."
                  className="w-56 pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            )}
          </div>

          <div className="mt-4">
          {filteredProjects.length === 0 && searchQuery ? (
            <div className="flex flex-col items-center justify-center py-12 bg-white rounded-xl border-2 border-dashed border-slate-200/80">
              <Search size={24} className="text-slate-300 mb-2" />
              <p className="text-slate-400 font-semibold">ไม่พบโปรเจค &ldquo;{searchQuery}&rdquo;</p>
            </div>
          ) : projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 bg-white rounded-xl border-2 border-dashed border-slate-200/80">
              <div className="p-3 bg-slate-50 rounded-full mb-3"><Briefcase size={28} className="text-slate-300" /></div>
              <p className="text-slate-400 font-semibold">ยังไม่มีโปรเจค</p>
              <p className="text-slate-400 text-xs mt-1">สร้างโปรเจคแรกของคุณด้านบน</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProjects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
};
