'use client';

import React, { useState, useMemo } from 'react';
import { useProjectStore } from '../store/useProjectStore';
import { differenceInDays, addDays } from 'date-fns';

const THAI_DAYS = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
const THAI_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
import { Task } from '../../../types/project';
import { TaskEditModal } from './TaskEditModal';
import { Plus, Calendar, ChevronDown, ChevronRight, GripVertical } from 'lucide-react';

const DAY_WIDTH = 40;
const ROW_HEIGHT = 48;
const HEADER_HEIGHT = 50;
const NAME_COL_WIDTH = 200;
const STATUS_COL_WIDTH = 120;
const ASSIGNEE_COL_WIDTH = 140;
const NOTES_COL_WIDTH = 180;
const LEFT_TOTAL = NAME_COL_WIDTH + STATUS_COL_WIDTH + ASSIGNEE_COL_WIDTH + NOTES_COL_WIDTH;

const STATUS_OPTIONS = [
  { value: 'pending', label: 'รอดำเนินการ', color: '#94a3b8' },
  { value: 'in_progress', label: 'กำลังทำ', color: '#3b82f6' },
  { value: 'completed', label: 'เสร็จแล้ว', color: '#10b981' },
  { value: 'overdue', label: 'เลยเวลา', color: '#ef4444' },
  { value: 'cancelled', label: 'ยกเลิก', color: '#6b7280' },
];

const BAR_COLORS = [
  { name: 'น้ำเงิน', value: '#3b82f6' },
  { name: 'เขียว', value: '#10b981' },
  { name: 'แดง', value: '#ef4444' },
  { name: 'ส้ม', value: '#f97316' },
  { name: 'เหลือง', value: '#eab308' },
  { name: 'ม่วง', value: '#8b5cf6' },
  { name: 'ชมพู', value: '#ec4899' },
  { name: 'ฟ้า', value: '#06b6d4' },
  { name: 'เทา', value: '#6b7280' },
  { name: 'คราม', value: '#6366f1' },
];

function getBarColor(task: Task, depth: number, defaultColor?: string): string {
  if (task.color) return task.color;
  if (defaultColor) return defaultColor;
  return depth === 0 ? '#3b82f6' : '#10b981';
}

function lightenColor(hex: string, amt: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, (num >> 16) + amt);
  const g = Math.min(255, ((num >> 8) & 0x00ff) + amt);
  const b = Math.min(255, (num & 0x0000ff) + amt);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

interface TaskNode {
  task: Task;
  depth: number;
}

function buildHierarchy(tasks: Task[]): TaskNode[] {
  const roots = tasks.filter((t) => !t.parentId);
  const result: TaskNode[] = [];

  function walk(parentId: string | undefined, depth: number) {
    for (const t of tasks) {
      if (t.parentId === parentId) {
        result.push({ task: t, depth });
        walk(t.id, depth + 1);
      }
    }
  }

  for (const r of roots) {
    result.push({ task: r, depth: 0 });
    walk(r.id, 1);
  }

  const visited = new Set(result.map((n) => n.task.id));
  for (const t of tasks) {
    if (!visited.has(t.id)) {
      result.push({ task: t, depth: 0 });
    }
  }
  return result;
}

interface GanttChartProps {
  readonly?: boolean;
}

export const GanttChart: React.FC<GanttChartProps> = ({ readonly = false }) => {
  const { getActiveProject, addTask, updateProject, updateTask, reorderTask } = useProjectStore();
  const project = getActiveProject();
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);
  const [showExtraCols, setShowExtraCols] = useState(false);

  if (!project) return null;

  const hierarchy = useMemo(() => buildHierarchy(project.tasks), [project.tasks]);

  const visibleNodes = useMemo(() => {
    return hierarchy.filter((n) => {
      if (n.depth === 0) return true;
      let parent = n.task.parentId;
      while (parent) {
        if (collapsed.has(parent)) return false;
        const p = hierarchy.find((h) => h.task.id === parent);
        parent = p ? p.task.parentId : undefined;
      }
      return true;
    });
  }, [hierarchy, collapsed]);

  const projectStart = new Date(project.startDate);
  const timelineStart = addDays(projectStart, -2);
  const totalDays = 60;

  const workingDaysSet = new Set(project.config.workingDays || [1, 2, 3, 4, 5]);
  const holidaySet = new Set(Object.keys(project.config.holidays || {}));

  const isWorkingDay = (date: Date) => {
    const day = date.getDay();
    const dateString = date.toISOString().split('T')[0];
    if (!workingDaysSet.has(day)) return false;
    if (holidaySet.has(dateString)) return false;
    return true;
  };

  const handleAddTask = (parentId?: string) => {
    let nextDate: string | undefined;
    if (parentId) {
      const siblings = project.tasks.filter(t => t.parentId === parentId);
      const last = siblings[siblings.length - 1];
      const baseEnd = last?.calculatedEndDate || project.tasks.find(t => t.id === parentId)?.calculatedEndDate;
      if (baseEnd) {
        const d = new Date(baseEnd);
        d.setDate(d.getDate() + 1);
        nextDate = d.toISOString().split('T')[0];
      }
    } else {
      const roots = project.tasks.filter(t => !t.parentId);
      const last = roots[roots.length - 1];
      if (last?.calculatedEndDate) {
        const d = new Date(last.calculatedEndDate);
        d.setDate(d.getDate() + 1);
        nextDate = d.toISOString().split('T')[0];
      }
    }

    let childColor: string | undefined;
    if (parentId) {
      const parentTask = project.tasks.find(t => t.id === parentId);
      if (parentTask) {
        const parentNode = hierarchy.find(h => h.task.id === parentId);
        childColor = getBarColor(parentTask, parentNode?.depth ?? 0, project.config.defaultBarColor);
      }
    }

    addTask({
      id: `t${Date.now()}`,
      name: parentId ? 'งานย่อยใหม่' : 'งานใหม่',
      duration: 3,
      dependencies: [],
      ...(parentId ? { parentId } : {}),
      ...(nextDate ? { manualStartDate: nextDate } : {}),
      ...(childColor ? { color: childColor } : {}),
    });
  };

  const hasChildren = (taskId: string) => project.tasks.some((t) => t.parentId === taskId);
  const toggleCollapse = (taskId: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  // Drag to reorder (with hierarchy support)
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    if (readonly) return;
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
    setDragTaskId(taskId);
  };

  const handleDragOver = (e: React.DragEvent, taskId: string) => {
    if (readonly || !dragTaskId || dragTaskId === taskId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const yRatio = (e.clientY - rect.top) / rect.height;
    const xRatio = (e.clientX - rect.left) / rect.width;

    let pos: 'before' | 'after' | 'child';
    if (xRatio > 0.6) {
      pos = 'child';
    } else if (yRatio < 0.4) {
      pos = 'before';
    } else {
      pos = 'after';
    }
    setDragOverTaskId(taskId + ':' + pos);
  };

  const handleDragLeave = () => setDragOverTaskId(null);

  const handleDrop = (e: React.DragEvent, targetTaskId: string) => {
    e.preventDefault();
    if (!dragTaskId || dragTaskId === targetTaskId) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const yRatio = (e.clientY - rect.top) / rect.height;
    const xRatio = (e.clientX - rect.left) / rect.width;
    const draggedTask = project.tasks.find(t => t.id === dragTaskId);
    const targetNode = visibleNodes.find(n => n.task.id === targetTaskId);
    if (!draggedTask || !targetNode) return;

    if (xRatio > 0.6) {
      // Make child of target
      updateTask(dragTaskId, { parentId: targetTaskId });
    } else {
      // Reorder: if dragging a child to root area → outdent
      if (draggedTask.parentId && targetNode.depth === 0) {
        updateTask(dragTaskId, { parentId: undefined });
      }
      reorderTask(dragTaskId, targetTaskId, yRatio < 0.4 ? 'before' : 'after');
    }

    setDragTaskId(null);
    setDragOverTaskId(null);
  };

  const handleDragEnd = () => {
    setDragTaskId(null);
    setDragOverTaskId(null);
  };

  // Bar drag to change date (smooth preview via refs)
  const barDragRef = React.useRef<{ taskId: string; startX: number; origManualStart: string; } | null>(null);
  const [barDragOffset, setBarDragOffset] = useState(0);

  const handleBarMouseDown = (e: React.MouseEvent, task: Task) => {
    if (readonly) return;
    e.stopPropagation();
    e.preventDefault();
    barDragRef.current = {
      taskId: task.id,
      startX: e.clientX,
      origManualStart: task.manualStartDate || task.calculatedStartDate || '',
    };
    setBarDragOffset(0);

    const handleMouseMove = (ev: MouseEvent) => {
      const drag = barDragRef.current;
      if (!drag) return;
      const delta = Math.round((ev.clientX - drag.startX) / DAY_WIDTH);
      setBarDragOffset(delta);
    };
    const handleMouseUp = (ev: MouseEvent) => {
      const drag = barDragRef.current;
      if (drag) {
        const delta = Math.round((ev.clientX - drag.startX) / DAY_WIDTH);
        if (delta !== 0 && drag.origManualStart) {
          const d = new Date(drag.origManualStart);
          d.setDate(d.getDate() + delta);
          updateTask(drag.taskId, { manualStartDate: d.toISOString().split('T')[0] });
        }
      }
      barDragRef.current = null;
      setBarDragOffset(0);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'ew-resize';
  };

  return (
    <>
      <div className="flex-1 bg-white rounded-xl border border-slate-200/80 card-shadow overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-gradient-to-r from-slate-50/90 to-white">
          <div className="flex items-center gap-3">
            {!readonly && (
              <button
                onClick={() => handleAddTask()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white text-xs font-bold rounded-lg hover:from-blue-700 hover:to-blue-600 transition-all shadow-sm active:scale-95"
              >
                <Plus size={14} />
                เพิ่มงาน
              </button>
            )}
            {!readonly && <div className="w-px h-5 bg-slate-200" />}
            <button
              onClick={() => setShowExtraCols(v => !v)}
              className="flex items-center gap-1 px-2 py-1.5 text-[10px] font-semibold text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all active:scale-95"
              title={showExtraCols ? 'ซ่อนคอลัมน์' : 'แสดงคอลัมน์'}
            >
              {showExtraCols ? 'ซ่อน' : 'แสดง'}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Calendar size={12} className="text-slate-400" />
            <span className="text-[10px] font-semibold text-slate-400">เริ่ม:</span>
            <input
              type="date"
              value={project.startDate}
              onChange={(e) => updateProject({ startDate: e.target.value })}
              className="text-xs font-semibold text-slate-600 focus:outline-none bg-transparent"
            />
          </div>
        </div>

        {/* Chart Area */}
        <div className="flex-1 overflow-auto">
          <div id="gantt-export-area">
            <div className="px-4 py-1.5 border-b border-slate-100 bg-slate-50/50">
              <span className="text-[11px] font-bold text-slate-500">{project.name}</span>
            </div>
            <div className="flex min-w-max">
            {/* ===== LEFT: Task Info Columns (sticky) ===== */}
            <div
              className="sticky left-0 z-20 bg-white border-r border-slate-200/80"
              style={{ width: showExtraCols ? LEFT_TOTAL : NAME_COL_WIDTH, minWidth: showExtraCols ? LEFT_TOTAL : NAME_COL_WIDTH }}
            >
              {/* Header Row */}
              <div className="flex border-b border-slate-100 bg-gradient-to-r from-slate-50/90 to-white" style={{ height: HEADER_HEIGHT }}>
                <div className="flex items-center px-4 text-[10px] font-bold text-slate-400 tracking-wider" style={{ width: NAME_COL_WIDTH }}>
                  ชื่องาน
                </div>
                {showExtraCols && <>
                  <div className="flex items-center px-3 text-[10px] font-bold text-slate-400 tracking-wider border-l border-slate-100/80" style={{ width: STATUS_COL_WIDTH }}>
                    สถานะ
                  </div>
                  <div className="flex items-center px-3 text-[10px] font-bold text-slate-400 tracking-wider border-l border-slate-100/80" style={{ width: ASSIGNEE_COL_WIDTH }}>
                    ผู้รับผิดชอบ
                  </div>
                  <div className="flex items-center px-3 text-[10px] font-bold text-slate-400 tracking-wider border-l border-slate-100/80" style={{ width: NOTES_COL_WIDTH }}>
                    หมายเหตุ
                  </div>
                </>}
              </div>

              {/* Task Rows */}
              {visibleNodes.map(({ task, depth }) => {
                const childCount = hasChildren(task.id);
                const dropPos = dragOverTaskId?.startsWith(task.id + ':') ? dragOverTaskId.split(':')[1] as 'before' | 'after' | 'child' | undefined : undefined;
                const statusMeta = STATUS_OPTIONS.find(s => s.value === (task.status || 'pending'));

                return (
                  <div
                    key={task.id}
                    className={`flex border-b border-slate-50/80 transition-colors group ${readonly ? '' : 'hover:bg-blue-50/40'} ${depth === 0 ? 'bg-white' : 'bg-slate-50/30'} ${dragTaskId === task.id ? 'opacity-40' : ''}`}
                    style={{ height: ROW_HEIGHT }}
                  >
                    {/* Name cell */}
                    <div
                      onClick={() => !readonly && setEditingTask(task)}
                      draggable={!readonly}
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      onDragOver={(e) => handleDragOver(e, task.id)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, task.id)}
                      onDragEnd={handleDragEnd}
                      className="flex items-center px-2 cursor-pointer"
                      style={{ width: NAME_COL_WIDTH, minWidth: NAME_COL_WIDTH, paddingLeft: 8 + depth * 20 }}
                    >
                      {dropPos === 'before' && <div className="absolute left-0 right-0 top-0 h-0.5 bg-blue-500 z-10" />}
                      {dropPos === 'after' && <div className="absolute left-0 right-0 bottom-0 h-0.5 bg-blue-500 z-10" />}
                      {dropPos === 'child' && <div className="absolute left-0 right-0 inset-y-0 border-2 border-blue-400/60 rounded-lg z-10" />}

                      {!readonly && (
                        <span className="p-0.5 mr-0.5 text-slate-200 hover:text-slate-400 cursor-grab active:cursor-grabbing shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <GripVertical size={12} />
                        </span>
                      )}

                      {childCount ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleCollapse(task.id); }}
                          className="p-0.5 mr-1 text-slate-400 hover:text-slate-600 shrink-0"
                        >
                          {collapsed.has(task.id) ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                        </button>
                      ) : (
                        depth > 0 && <span className="w-[22px] shrink-0" /> 
                      )}

                      <span className={`text-xs font-semibold truncate transition-colors flex-1 min-w-0 ${depth > 0 ? 'text-slate-500 group-hover:text-emerald-600' : 'text-slate-700 group-hover:text-blue-600'}`}>
                        {task.name}
                      </span>

                      {!readonly && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleAddTask(task.id); }}
                          className={`p-1 rounded opacity-0 group-hover:opacity-100 transition-all shrink-0 ${depth > 0 ? 'text-slate-300 hover:text-emerald-600 hover:bg-emerald-50' : 'text-slate-300 hover:text-blue-600 hover:bg-blue-50'}`}
                          title="เพิ่มงานย่อย"
                        >
                          <Plus size={14} />
                        </button>
                      )}
                    </div>

                    {showExtraCols && <>
                      {/* Status cell */}
                      <div className="flex items-center px-2 border-l border-slate-100/80 gap-1" style={{ width: STATUS_COL_WIDTH, minWidth: STATUS_COL_WIDTH }}>
                        {readonly ? (
                          <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: statusMeta?.color }} />
                            {statusMeta?.label}
                          </span>
                        ) : (
                          <>
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: statusMeta?.color }} />
                            <select
                              value={task.status || 'pending'}
                              onChange={(e) => updateTask(task.id, { status: e.target.value })}
                              onClick={(e) => e.stopPropagation()}
                              className="flex-1 text-xs font-semibold text-slate-700 bg-transparent border border-transparent hover:border-slate-200 rounded-lg px-1.5 py-1 focus:outline-none focus:border-blue-400 focus:bg-white transition-all cursor-pointer"
                            >
                              {STATUS_OPTIONS.map(s => (
                                <option key={s.value} value={s.value}>{s.label}</option>
                              ))}
                            </select>
                          </>
                        )}
                      </div>

                      {/* Assignee cell */}
                      <div className="flex items-center px-2 border-l border-slate-100/80" style={{ width: ASSIGNEE_COL_WIDTH, minWidth: ASSIGNEE_COL_WIDTH }}>
                        {readonly ? (
                          <span className="text-xs text-slate-600 truncate">{task.assignee || '-'}</span>
                        ) : (
                          <input
                            type="text"
                            defaultValue={task.assignee || ''}
                            onBlur={(e) => updateTask(task.id, { assignee: e.target.value || undefined })}
                            onClick={(e) => e.stopPropagation()}
                            placeholder="-"
                            className="w-full text-xs text-slate-700 bg-transparent border border-transparent hover:border-slate-200 rounded-lg px-1.5 py-1 focus:outline-none focus:border-blue-400 focus:bg-white transition-all"
                          />
                        )}
                      </div>

                      {/* Notes cell */}
                      <div className="flex items-center px-2 border-l border-slate-100/80" style={{ width: NOTES_COL_WIDTH, minWidth: NOTES_COL_WIDTH }}>
                        {readonly ? (
                          <span className="text-xs text-slate-600 truncate">{task.notes || '-'}</span>
                        ) : (
                          <input
                            type="text"
                            defaultValue={task.notes || ''}
                            onBlur={(e) => updateTask(task.id, { notes: e.target.value || undefined })}
                            onClick={(e) => e.stopPropagation()}
                            placeholder="-"
                            className="w-full text-xs text-slate-700 bg-transparent border border-transparent hover:border-slate-200 rounded-lg px-1.5 py-1 focus:outline-none focus:border-blue-400 focus:bg-white transition-all"
                          />
                        )}
                      </div>
                    </>}
                  </div>
                );
              })}
            </div>

            {/* ===== RIGHT: Timeline Grid ===== */}
            <div className="flex-1">
              {/* Date Header */}
              <div className="flex border-b border-slate-100 bg-gradient-to-r from-slate-50/90 to-white" style={{ height: HEADER_HEIGHT }}>
                {Array.from({ length: totalDays }).map((_, i) => {
                  const date = addDays(timelineStart, i);
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                  const dateString = date.toISOString().split('T')[0];
                  const isHoliday = project.config.holidays && dateString in project.config.holidays;
                  return (
                    <div
                      key={i}
                      className={`flex-shrink-0 border-r border-slate-100/80 flex flex-col items-center justify-center text-[10px] font-medium ${
                      isHoliday
                        ? 'bg-rose-100/70 text-rose-600'
                        : isWeekend
                        ? 'bg-slate-200/60 text-slate-500'
                        : 'text-slate-500'
                      }`}
                      style={{ width: DAY_WIDTH }}
                    >
                      <span className={`text-[9px] leading-tight ${isHoliday ? 'font-semibold' : ''}`}>{THAI_DAYS[date.getDay()]}</span>
                      <span className={`text-[11px] leading-tight ${isHoliday ? 'font-bold' : 'font-semibold'}`}>{date.getDate()}</span>
                      <span className="text-[8px] leading-tight text-slate-400">{THAI_MONTHS[date.getMonth()]}</span>
                    </div>
                  );
                })}
              </div>

              {/* Task Rows with Bars */}
              <div className="relative" style={{ width: totalDays * DAY_WIDTH }}>
                {visibleNodes.map(({ task, depth }) => {
                  const hasCalc = task.calculatedStartDate && task.calculatedEndDate;

                  return (
                    <div
                      key={task.id}
                      className={`relative border-b border-slate-50/80 hover:bg-blue-50/20 transition-colors ${depth === 0 ? 'bg-white' : 'bg-slate-50/30'}`}
                      style={{ height: ROW_HEIGHT }}
                    >
                      {/* Weekend/holiday background stripes */}
                      {Array.from({ length: totalDays }).map((_, i) => {
                        const date = addDays(timelineStart, i);
                        const dateString = date.toISOString().split('T')[0];
                        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                        const isHoliday = project.config.holidays && dateString in project.config.holidays;
                        if (!isWeekend && !isHoliday) return null;
                        const bgClass = isHoliday ? 'bg-rose-100/60' : 'bg-slate-200/50';
                        return (
                          <div
                            key={i}
                            className={`absolute top-0 bottom-0 ${bgClass} border-r border-white/60`}
                            style={{ left: i * DAY_WIDTH, width: DAY_WIDTH }}
                          />
                        );
                      })}

                      {/* Depth indicator line */}
                      {depth > 0 && (
                        <div
                          className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-200/60"
                          style={{ left: depth * 20 - 8 }}
                        />
                      )}

                      {/* Task Bar */}
                      {hasCalc &&
                        (() => {
                          const start = new Date(task.calculatedStartDate!);
                          const end = new Date(task.calculatedEndDate!);
                          const barTop = (ROW_HEIGHT - 32) / 2;

                          const dayIndices: number[] = [];
                          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                            const idx = differenceInDays(new Date(d), timelineStart);
                            if (idx >= 0 && idx < totalDays && isWorkingDay(new Date(d))) {
                              dayIndices.push(idx);
                            }
                          }

                          if (dayIndices.length === 0) return null;

                          const segments: Array<{ startIdx: number; length: number }> = [];
                          let segStart = dayIndices[0];
                          let prev = dayIndices[0];
                          for (let i = 1; i < dayIndices.length; i++) {
                            const cur = dayIndices[i];
                            if (cur === prev + 1) {
                              prev = cur;
                              continue;
                            }
                            segments.push({ startIdx: segStart, length: prev - segStart + 1 });
                            segStart = cur;
                            prev = cur;
                          }
                          segments.push({ startIdx: segStart, length: prev - segStart + 1 });

                          const barColor = getBarColor(task, depth, project.config.defaultBarColor);
                          const barLighter = lightenColor(barColor, 60);

                          return (
                            <>
                              {segments.map((s, si) => {
                                const isDragging = barDragRef.current?.taskId === task.id;
                                return (
                                  <div
                                    key={si}
                                    className={`absolute h-8 flex items-center px-2.5 hover:brightness-110 transition-shadow ${readonly ? 'cursor-default' : 'cursor-ew-resize active:shadow-lg'} ${isDragging ? 'shadow-xl brightness-110 z-20' : ''}`}
                                    style={{
                                      left: s.startIdx * DAY_WIDTH,
                                      width: s.length * DAY_WIDTH,
                                      top: barTop,
                                      transform: isDragging && barDragOffset ? `translateX(${barDragOffset * DAY_WIDTH}px)` : '',
                                      background: `linear-gradient(135deg, ${barColor}, ${lightenColor(barColor, 30)})`,
                                      borderRadius: '8px',
                                      boxShadow: `0 2px 6px ${barColor}40`,
                                      border: `1px solid ${barLighter}`,
                                    }}
                                    onMouseDown={(e) => !readonly && handleBarMouseDown(e, task)}
                                  >
                                    <div className="truncate text-xs font-semibold text-white drop-shadow-sm">
                                      {si === 0 ? task.name : ''}
                                    </div>
                                  </div>
                                );
                              })}
                            </>
                          );
                        })()}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* Edit Modal */}
      {!readonly && editingTask && <TaskEditModal key={editingTask.id} task={editingTask} onClose={() => setEditingTask(null)} />}
    </>
  );
};
