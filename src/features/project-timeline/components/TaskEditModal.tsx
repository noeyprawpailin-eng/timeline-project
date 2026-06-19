'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Clock, Calendar, Trash2, ArrowRight } from 'lucide-react';
import { Task } from '../../../types/project';
import { useProjectStore } from '../store/useProjectStore';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'รอดำเนินการ', color: '#94a3b8' },
  { value: 'in_progress', label: 'กำลังทำ', color: '#3b82f6' },
  { value: 'completed', label: 'เสร็จแล้ว', color: '#10b981' },
  { value: 'overdue', label: 'เลยเวลา', color: '#ef4444' },
  { value: 'cancelled', label: 'ยกเลิก', color: '#6b7280' },
];

function isWDFrom(date: Date, workingDays: Set<number>, holidays: Set<string>): boolean {
  if (!workingDays.has(date.getDay())) return false;
  if (holidays.has(date.toISOString().split('T')[0])) return false;
  return true;
}

function calcEndDate(start: Date, numDays: number, workingDays: Set<number>, holidays: Set<string>): string {
  if (numDays <= 0) return start.toISOString().split('T')[0];
  let cur = new Date(start);
  while (!isWDFrom(cur, workingDays, holidays)) cur.setDate(cur.getDate() + 1);
  let rem = numDays;
  while (rem > 1) {
    cur.setDate(cur.getDate() + 1);
    if (isWDFrom(cur, workingDays, holidays)) rem--;
  }
  return cur.toISOString().split('T')[0];
}

function calcDuration(start: Date, end: Date, workingDays: Set<number>, holidays: Set<string>): number {
  if (start > end) return 1;
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    if (isWDFrom(cur, workingDays, holidays)) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return Math.max(1, count);
}

interface TaskEditModalProps {
  task: Task;
  onClose: () => void;
}

export const TaskEditModal: React.FC<TaskEditModalProps> = ({ task, onClose }) => {
  const { updateTask, deleteTask, getActiveProject, updateProject } = useProjectStore();
  const project = getActiveProject();

  const isHeading = task.type === 'heading';
  const wd = new Set(project?.config.workingDays ?? [1, 2, 3, 4, 5]);
  const hol = new Set(Object.keys(project?.config.holidays ?? {}));
  const startBase = task.manualStartDate || task.calculatedStartDate || project?.startDate || '';
  const projectAssignees = project?.assignees || [];

  const [name, setName] = useState(task.name);
  const [durStr, setDurStr] = useState(String(task.duration));
  const [endDateVal, setEndDateVal] = useState(task.calculatedEndDate || '');
  const [manualStartDate, setManualStartDate] = useState(task.manualStartDate || '');
  const [taskAssignee, setTaskAssignee] = useState(task.assignee || '');
  const [taskNotes, setTaskNotes] = useState(task.notes || '');
  const [taskStatus, setTaskStatus] = useState(task.status || 'pending');
  const activeRef = useRef<'dur' | 'end' | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const handleSave = useCallback(() => {
    const finalDur = isHeading ? 0 : (durStr ? parseInt(durStr) || 1 : task.duration);
    const assigneeColor = projectAssignees.find(a => a.name === taskAssignee)?.color;
    updateTask(task.id, {
      name,
      duration: finalDur,
      manualStartDate: isHeading ? undefined : (manualStartDate || undefined),
      color: assigneeColor || undefined,
      status: isHeading ? undefined : taskStatus,
      assignee: taskAssignee || undefined,
      notes: isHeading ? undefined : (taskNotes || undefined),
    });
    onClose();
  }, [name, durStr, manualStartDate, taskAssignee, taskNotes, taskStatus, task.id, task.duration, updateTask, onClose, isHeading, projectAssignees]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) handleSave();
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleSave();
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [handleSave]);

  const handleDelete = () => {
    deleteTask(task.id);
    onClose();
  };

  const onDurationChange = (raw: string) => {
    setDurStr(raw);
    activeRef.current = 'dur';
    const s = manualStartDate || startBase;
    const d = parseInt(raw);
    if (d > 0 && s) {
      setEndDateVal(calcEndDate(new Date(s), d, wd, hol));
    } else {
      setEndDateVal('');
    }
  };

  const onEndDateChange = (val: string) => {
    setEndDateVal(val);
    activeRef.current = 'end';
    const s = manualStartDate || startBase;
    if (val && s) {
      setDurStr(String(calcDuration(new Date(s), new Date(val), wd, hol)));
    }
  };

  const onStartDateChange = (val: string) => {
    setManualStartDate(val);
    const s = val || startBase;
    if (!s) return;
    if (activeRef.current === 'dur') {
      const d = parseInt(durStr);
      if (d > 0) setEndDateVal(calcEndDate(new Date(s), d, wd, hol));
    } else if (activeRef.current === 'end') {
      if (endDateVal) setDurStr(String(calcDuration(new Date(s), new Date(endDateVal), wd, hol)));
    }
  };

  const startDisplay = manualStartDate || startBase;

  if (isHeading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
        <div ref={modalRef} className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-[400px] animate-scaleIn">
          <div className="flex items-center justify-between p-6 border-b border-slate-100">
            <h3 className="text-lg font-bold text-slate-900">แก้ไขหัวข้อ</h3>
            <button onClick={handleSave} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
              <X size={20} />
            </button>
          </div>
          <div className="p-6 space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">ชื่อหัวข้อ</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} autoFocus
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
          </div>
          <div className="flex items-center justify-between p-6 border-t border-slate-100">
            <button onClick={handleDelete} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-red-500 hover:bg-red-50 rounded-lg transition-colors">
              <Trash2 size={16} /> ลบหัวข้อ
            </button>
            <button onClick={handleSave} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all active:scale-[0.98]">
              บันทึก
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm animate-fadeIn">
      <div ref={modalRef} className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-[480px] max-h-[90vh] overflow-y-auto animate-scaleIn">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-900">แก้ไขงาน</h3>
          <button onClick={handleSave} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">ชื่องาน</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} autoFocus
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          <div className="grid grid-cols-5 gap-3 items-end">
            <div className="col-span-2 space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Calendar size={12} /> เริ่ม
              </label>
              <input type="date" value={startDisplay} onChange={(e) => onStartDateChange(e.target.value)}
                className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
            <div className="col-span-1 flex items-center justify-center pb-1">
              <ArrowRight size={20} className="text-slate-300" />
            </div>
            <div className="col-span-2 space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Calendar size={12} /> สิ้นสุด
              </label>
              <input type="date" value={endDateVal} onChange={(e) => onEndDateChange(e.target.value)}
                className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 flex items-center justify-between">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
              <Clock size={12} className="inline mr-1" /> ระยะเวลา
            </span>
            <div className="flex items-center gap-2">
              <input type="number" min={1} value={durStr} placeholder="-"
                onChange={(e) => onDurationChange(e.target.value)}
                className="w-16 px-2.5 py-1.5 bg-white border border-blue-200 rounded-lg text-sm font-bold text-blue-700 text-center focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
              <span className="text-sm font-bold text-blue-600">วัน</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">สถานะ</label>
              <div className="relative">
                <select value={taskStatus} onChange={(e) => setTaskStatus(e.target.value)}
                  className="w-full pl-8 pr-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none"
                >
                  {STATUS_OPTIONS.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
                <span className="absolute left-3 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full pointer-events-none"
                  style={{ background: STATUS_OPTIONS.find(s => s.value === taskStatus)?.color }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">ผู้รับผิดชอบ</label>
              <select value={taskAssignee} onChange={(e) => setTaskAssignee(e.target.value)}
                className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              >
                <option value="">- ไม่ระบุ -</option>
                {projectAssignees.map(a => (
                  <option key={a.name} value={a.name}>{a.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">หมายเหตุ</label>
            <textarea value={taskNotes} onChange={(e) => setTaskNotes(e.target.value)} placeholder="หมายเหตุ..." rows={2}
              className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
            />
          </div>

          {taskAssignee && (() => {
            const currentColor = projectAssignees.find(a => a.name === taskAssignee)?.color || project?.config.defaultBarColor || '#3b82f6';
            return (
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg">
                <span className="text-xs text-slate-500">สีแถบงาน:</span>
                <span className="w-4 h-4 rounded-full" style={{ background: currentColor }} />
                <span className="text-xs font-medium text-slate-600">{currentColor}</span>
              </div>
            );
          })()}
        </div>

        <div className="flex items-center justify-between p-6 border-t border-slate-100">
          <button onClick={handleDelete} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-red-500 hover:bg-red-50 rounded-lg transition-colors">
            <Trash2 size={16} /> ลบงาน
          </button>
          <button onClick={handleSave} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all active:scale-[0.98]">
            บันทึก
          </button>
        </div>
      </div>
    </div>
  );
};
