'use client';

import React, { useState } from 'react';
import { useProjectStore } from '../store/useProjectStore';
import { Bell, Plus, Trash2, CheckCircle2, Circle, X } from 'lucide-react';
import type { Reminder } from '@/types/project';

interface ReminderModalProps {
  projectId: string;
  onClose: () => void;
}

export const ReminderModal: React.FC<ReminderModalProps> = ({ projectId, onClose }) => {
  const { getActiveProject, addReminder, removeReminder, toggleReminder } = useProjectStore();
  const project = getActiveProject();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');

  const reminders: Reminder[] = project?.reminders || [];
  const upcoming = reminders.filter(r => !r.done).sort((a, b) => a.date.localeCompare(b.date));
  const completed = reminders.filter(r => r.done);

  const handleAdd = async () => {
    if (!title.trim() || !date) return;
    await addReminder(projectId, { title: title.trim(), date });
    setTitle('');
    setDate('');
  };

  const today = new Date().toISOString().split('T')[0];
  const isOverdue = (d: string) => d < today;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg mx-4 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <Bell size={18} className="text-amber-500" />
            <h2 className="text-sm font-bold text-slate-800">การแจ้งเตือน</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all">
            <X size={16} />
          </button>
        </div>

        <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-100 bg-slate-50/50">
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="หัวข้อ..."
            className="flex-1 text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-400 bg-white"
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-400 bg-white"
          />
          <button onClick={handleAdd} disabled={!title.trim() || !date}
            className="flex items-center gap-1 px-3 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 text-white text-xs font-bold rounded-lg transition-all active:scale-95"
          >
            <Plus size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {upcoming.length === 0 && completed.length === 0 && (
            <div className="text-center py-10 text-xs text-slate-400">ยังไม่มีรายการแจ้งเตือน</div>
          )}

          {upcoming.map(r => (
            <div key={r.id} className="flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors group">
              <button onClick={() => toggleReminder(projectId, r.id)} className="shrink-0 text-slate-300 hover:text-emerald-500 transition-colors">
                {r.done ? <CheckCircle2 size={18} className="text-emerald-500" /> : <Circle size={18} />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-slate-700 truncate">{r.title}</div>
                <div className={`text-[10px] font-medium ${isOverdue(r.date) ? 'text-red-500' : 'text-slate-400'}`}>
                  {isOverdue(r.date) ? 'เลยกำหนด ' : ''}{r.date}
                </div>
              </div>
              <button onClick={() => removeReminder(projectId, r.id)} className="shrink-0 p-1 rounded-lg opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all">
                <Trash2 size={14} />
              </button>
            </div>
          ))}

          {completed.length > 0 && (
            <>
              <div className="pt-3 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3">เสร็จแล้ว</div>
              {completed.map(r => (
                <div key={r.id} className="flex items-center gap-2 px-3 py-2 rounded-xl opacity-60">
                  <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-slate-500 line-through truncate">{r.title}</div>
                    <div className="text-[10px] text-slate-400">{r.date}</div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
