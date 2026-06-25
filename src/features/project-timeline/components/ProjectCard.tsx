'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Calendar, Layers, ArrowRight, Trash2, Copy, Clock, Pencil, AlertTriangle, Users, Bell } from 'lucide-react';
import { Project, Assignee } from '../../../types/project';
import { useProjectStore } from '../store/useProjectStore';
import { HolidayEngine } from '../../../core/calendar/HolidayEngine';
import { formatThaiDate } from '../../../lib/formatDate';
import { ReminderModal } from './ReminderModal';

const ASSIGNEE_COLORS = [
  '#3b82f6', '#10b981', '#ef4444', '#f97316', '#eab308',
  '#8b5cf6', '#ec4899', '#06b6d4', '#6b7280', '#6366f1',
];

interface ProjectCardProps {
  project: Project;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project }) => {
  const { selectProject, deleteProject, duplicateProject, renameProject, updateAssignees } = useProjectStore();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(project.name);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showAssignees, setShowAssignees] = useState(false);
  const [assigneeList, setAssigneeList] = useState<Assignee[]>(project.assignees || []);
  const [newAssigneeName, setNewAssigneeName] = useState('');
  const [newAssigneeColor, setNewAssigneeColor] = useState(ASSIGNEE_COLORS[0]);
  const [editingAssignee, setEditingAssignee] = useState<string | null>(null);
  const [editAssigneeName, setEditAssigneeName] = useState('');
  const [editAssigneeColor, setEditAssigneeColor] = useState('');
  const [renameMap, setRenameMap] = useState<Record<string, string>>({});
  const [showReminders, setShowReminders] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  useEffect(() => {
    setEditName(project.name);
  }, [project.name]);

  useEffect(() => {
    setAssigneeList(project.assignees || []);
  }, [project.assignees]);

  const saveName = () => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== project.name) {
      renameProject(project.id, trimmed);
    } else {
      setEditName(project.name);
    }
    setEditing(false);
  };
  const endDates = project.tasks.map((t) => t.calculatedEndDate).filter(Boolean) as string[];
  const projectEnd = endDates.length ? endDates.sort().reverse()[0] : project.startDate;
  const engine = new HolidayEngine(project.config);
  const totalDays = engine.countWorkingDays(
    new Date(project.startDate),
    new Date(projectEnd)
  );

  const handleSaveAssignees = () => {
    updateAssignees(project.id, assigneeList, Object.keys(renameMap).length > 0 ? renameMap : undefined);
    setShowAssignees(false);
    setRenameMap({});
  };

  const handleAddAssignee = () => {
    if (!newAssigneeName.trim()) return;
    if (assigneeList.some(a => a.name === newAssigneeName.trim())) return;
    setAssigneeList([...assigneeList, { name: newAssigneeName.trim(), color: newAssigneeColor }]);
    setNewAssigneeName('');
  };

  const handleRemoveAssignee = (name: string) => {
    setAssigneeList(assigneeList.filter(a => a.name !== name));
  };

  return (
    <div className="group relative bg-white border border-slate-200/80 rounded-xl p-4 card-shadow card-shadow-hover transition-all duration-200">
      <div className="absolute top-0 left-4 right-4 h-0.5 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="flex justify-between items-start mb-3">
        <div className="p-1.5 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600 rounded-lg group-hover:from-blue-600 group-hover:to-indigo-600 group-hover:text-white transition-all duration-200">
          <Layers size={16} />
        </div>
        <div className="flex items-center gap-0.5">
          <button onClick={(e) => { e.stopPropagation(); setShowReminders(true); }} className="relative p-1.5 text-slate-300 hover:text-amber-500 hover:bg-amber-50 rounded-md transition-colors" title="การแจ้งเตือน">
            <Bell size={14} />
            {(project.reminders || []).filter(r => !r.done).length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 flex items-center justify-center bg-amber-500 text-white text-[8px] font-bold rounded-full">
                {(project.reminders || []).filter(r => !r.done).length}
              </span>
            )}
          </button>
          <button onClick={(e) => { e.stopPropagation(); setShowAssignees(true); }} className="p-1.5 text-slate-300 hover:text-violet-500 hover:bg-violet-50 rounded-md transition-colors" title="จัดการผู้รับผิดชอบ">
            <Users size={14} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); duplicateProject(project.id); }} className="p-1.5 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="ทำสำเนา">
            <Copy size={14} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors" title="ลบโปรเจค">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1 mb-2.5 group">
        {editing ? (
          <input ref={inputRef} value={editName} onChange={(e) => setEditName(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') { setEditName(project.name); setEditing(false); } }}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 text-sm font-bold text-slate-900 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5 outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        ) : (
          <>
            <h3 className="flex-1 text-sm font-bold text-slate-900 truncate">{project.name}</h3>
            <button onClick={(e) => { e.stopPropagation(); setEditName(project.name); setEditing(true); }}
              className="p-1 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded opacity-0 group-hover:opacity-100 transition-all" title="แก้ไขชื่อ">
              <Pencil size={12} />
            </button>
          </>
        )}
      </div>
      
      <div className="flex items-center gap-2 flex-wrap mb-3.5 text-[11px] text-slate-400">
        <div className="flex items-center gap-1">
          <Calendar size={11} />
          <span>{formatThaiDate(project.startDate)} – {formatThaiDate(projectEnd)}</span>
        </div>
        <span className="text-slate-200">·</span>
        <div className="flex items-center gap-1">
          <Clock size={11} />
          <span>{totalDays} วัน</span>
        </div>
        <span className="text-slate-200">·</span>
        <div className="flex items-center gap-1">
          <Layers size={11} />
          <span>{project.tasks.length} งาน</span>
        </div>
      </div>

      {project.assignees && project.assignees.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {project.assignees.map(a => (
            <span key={a.name} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white" style={{ background: a.color }}>
              {a.name}
            </span>
          ))}
        </div>
      )}

      <button onClick={() => selectProject(project.id)}
        className="w-full py-2 px-3 bg-slate-50 text-slate-500 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 hover:bg-blue-600 hover:text-white transition-all duration-200 active:scale-[0.98] group/btn">
        เปิดโปรเจค
        <ArrowRight size={13} className="transition-transform group-hover/btn:translate-x-0.5" />
      </button>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setConfirmDelete(false)}>
          <div className="bg-white rounded-xl shadow-2xl p-5 w-80" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="p-1.5 bg-red-50 rounded-full"><AlertTriangle size={16} className="text-red-500" /></div>
              <h3 className="text-sm font-bold text-slate-900">ยืนยันการลบ</h3>
            </div>
            <p className="text-xs text-slate-500 mb-5">
              คุณแน่ใจหรือต้องการลบโปรเจค <span className="font-semibold text-slate-700">{project.name}</span>? การกระทำนี้ไม่สามารถย้อนกลับได้
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDelete(false)} className="px-3.5 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-lg transition-all">ยกเลิก</button>
              <button onClick={() => { deleteProject(project.id); setConfirmDelete(false); }} className="px-3.5 py-2 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-all">ยืนยันการลบ</button>
            </div>
          </div>
        </div>
      )}

      {showReminders && (
        <ReminderModal projectId={project.id} onClose={() => setShowReminders(false)} />
      )}

      {showAssignees && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { setShowAssignees(false); setAssigneeList(project.assignees || []); setRenameMap({}); }}>
          <div className="bg-white rounded-xl shadow-2xl p-5 w-[500px]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="p-1.5 bg-violet-50 rounded-full"><Users size={16} className="text-violet-500" /></div>
              <h3 className="text-sm font-bold text-slate-900">จัดการผู้รับผิดชอบ</h3>
            </div>

            <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
              {assigneeList.map((a, idx) => (
                editingAssignee === a.name ? (
                  <div key={a.name} className="flex items-center gap-2 py-1.5 px-2 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-1">
                      {ASSIGNEE_COLORS.map(c => (
                        <button key={c} type="button" onMouseDown={(e) => { e.preventDefault(); setEditAssigneeColor(c); }}
                          className={`w-4 h-4 rounded-full border ${editAssigneeColor === c ? 'border-slate-800 scale-110' : 'border-transparent'}`}
                          style={{ background: c }} />
                      ))}
                    </div>
                    <input type="text" value={editAssigneeName}
                      onChange={(e) => setEditAssigneeName(e.target.value)}
                      onBlur={() => {
                        if (editAssigneeName.trim() && editAssigneeName.trim() !== a.name && !assigneeList.some(x => x.name === editAssigneeName.trim())) {
                          const updated = [...assigneeList];
                          updated[idx] = { name: editAssigneeName.trim(), color: editAssigneeColor };
                          setAssigneeList(updated);
                          setRenameMap(prev => ({ ...prev, [a.name]: editAssigneeName.trim() }));
                        }
                        setEditingAssignee(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                        if (e.key === 'Escape') setEditingAssignee(null);
                      }}
                      className="flex-1 text-sm font-medium text-slate-700 bg-transparent border-none outline-none px-1"
                      autoFocus
                    />
                    <button onClick={() => setEditingAssignee(null)} className="text-slate-400 hover:text-slate-600 text-xs font-bold">✓</button>
                  </div>
                ) : (
                  <div key={a.name}
                    onClick={() => { setEditingAssignee(a.name); setEditAssigneeName(a.name); setEditAssigneeColor(a.color); }}
                    className="flex items-center gap-2 py-1.5 px-2 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ background: a.color }} />
                    <span className="flex-1 text-sm font-medium text-slate-700">{a.name}</span>
                    <button onClick={(e) => { e.stopPropagation(); handleRemoveAssignee(a.name); }} className="text-red-400 hover:text-red-600 text-xs font-bold">&times;</button>
                  </div>
                )
              ))}
              {assigneeList.length === 0 && <p className="text-xs text-slate-400 text-center py-2">ยังไม่มีผู้รับผิดชอบ</p>}
            </div>

            <div className="flex items-center gap-2 mb-4">
              <input type="text" value={newAssigneeName} onChange={(e) => setNewAssigneeName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddAssignee()}
                placeholder="ชื่อผู้รับผิดชอบ"
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
              />
              <div className="flex items-center gap-1">
                {ASSIGNEE_COLORS.map(c => (
                  <button key={c} onClick={() => setNewAssigneeColor(c)}
                    className={`w-5 h-5 rounded-full border-2 ${newAssigneeColor === c ? 'border-slate-800 scale-110' : 'border-transparent'}`}
                    style={{ background: c }} />
                ))}
              </div>
              <button onClick={handleAddAssignee} disabled={!newAssigneeName.trim()}
                className="px-3 py-2 bg-violet-500 disabled:opacity-40 text-white text-xs font-bold rounded-lg hover:bg-violet-600 transition-all">เพิ่ม</button>
            </div>

            <div className="flex justify-end gap-2">
              <button onClick={() => { setShowAssignees(false); setAssigneeList(project.assignees || []); setRenameMap({}); }}
                className="px-3.5 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-lg transition-all">ยกเลิก</button>
              <button onClick={handleSaveAssignees}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-violet-500 hover:bg-violet-600 rounded-lg transition-all">บันทึก</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
