'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Calendar, Layers, ArrowRight, Trash2, Copy, Clock, Pencil } from 'lucide-react';
import { Project } from '../../../types/project';
import { useProjectStore } from '../store/useProjectStore';
import { HolidayEngine } from '../../../core/calendar/HolidayEngine';

interface ProjectCardProps {
  project: Project;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project }) => {
  const { selectProject, deleteProject, duplicateProject, renameProject } = useProjectStore();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(project.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

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

  return (
    <div className="group relative bg-white border border-slate-200/80 rounded-xl p-4 card-shadow card-shadow-hover transition-all duration-200">
      {/* Top accent bar */}
      <div className="absolute top-0 left-4 right-4 h-0.5 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="flex justify-between items-start mb-3">
        <div className="p-1.5 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600 rounded-lg group-hover:from-blue-600 group-hover:to-indigo-600 group-hover:text-white transition-all duration-200">
          <Layers size={16} />
        </div>
        <div className="flex items-center gap-0.5">
          <button 
            onClick={(e) => { e.stopPropagation(); duplicateProject(project.id); }}
            className="p-1.5 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
            title="ทำสำเนา"
          >
            <Copy size={14} />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); deleteProject(project.id); }}
            className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1 mb-2.5 group">
        {editing ? (
          <input
            ref={inputRef}
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') { setEditName(project.name); setEditing(false); } }}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 text-sm font-bold text-slate-900 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5 outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        ) : (
          <>
            <h3 className="flex-1 text-sm font-bold text-slate-900 truncate">{project.name}</h3>
            <button
              onClick={(e) => { e.stopPropagation(); setEditName(project.name); setEditing(true); }}
              className="p-1 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded opacity-0 group-hover:opacity-100 transition-all"
              title="แก้ไขชื่อ"
            >
              <Pencil size={12} />
            </button>
          </>
        )}
      </div>
      
      <div className="flex items-center gap-2 flex-wrap mb-3.5 text-[11px] text-slate-400">
        <div className="flex items-center gap-1">
          <Calendar size={11} />
          <span>{new Date(project.startDate).toLocaleDateString('th-TH')} – {new Date(projectEnd).toLocaleDateString('th-TH')}</span>
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

      <button 
        onClick={() => selectProject(project.id)}
        className="w-full py-2 px-3 bg-slate-50 text-slate-500 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 hover:bg-blue-600 hover:text-white transition-all duration-200 active:scale-[0.98] group/btn"
      >
        เปิดโปรเจค
        <ArrowRight size={13} className="transition-transform group-hover/btn:translate-x-0.5" />
      </button>
    </div>
  );
};
