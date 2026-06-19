'use client';

import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useProjectStore } from '../store/useProjectStore';
import { differenceInDays, addDays } from 'date-fns';
import { Task } from '../../../types/project';
import { TaskEditModal } from './TaskEditModal';
import { Plus, Calendar, ChevronDown, ChevronRight, GripVertical, List, Layers, Undo2, Redo2 } from 'lucide-react';
import { formatThaiDate } from '../../../lib/formatDate';

const THAI_DAYS = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
const THAI_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const DAY_WIDTH = 28;
const ROW_HEIGHT = 28;
const HEADER_HEIGHT = 40;
const STATUS_COL_WIDTH = 120;
const ASSIGNEE_COL_WIDTH = 140;
const NOTES_COL_WIDTH = 180;
const DRAG_HANDLE_WIDTH = 32;

const STATUS_OPTIONS = [
  { value: 'pending', label: 'รอดำเนินการ', color: '#94a3b8' },
  { value: 'in_progress', label: 'กำลังทำ', color: '#3b82f6' },
  { value: 'completed', label: 'เสร็จแล้ว', color: '#10b981' },
  { value: 'overdue', label: 'เลยเวลา', color: '#ef4444' },
  { value: 'cancelled', label: 'ยกเลิก', color: '#6b7280' },
];

function getBarColor(task: Task, depth: number, defaultColor?: string, assignees?: { name: string; color: string }[]): string {
  if (task.type === 'heading') return 'transparent';
  if (task.assignee && assignees) {
    const found = assignees.find(a => a.name === task.assignee);
    if (found) return found.color;
  }
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

function measureTextWidth(text: string, font = '12px sans-serif'): number {
  if (typeof document === 'undefined') return text.length * 7;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return text.length * 7;
  ctx.font = font;
  return ctx.measureText(text).width;
}

function calcMinNameWidth(tasks: Task[]): number {
  let max = 0;
  for (const t of tasks) {
    const w = measureTextWidth(t.name, '600 12px sans-serif');
    max = Math.max(max, w);
  }
  return Math.max(160, Math.min(max + 40, 400));
}

interface GanttChartProps {
  readonly?: boolean;
}

export const GanttChart: React.FC<GanttChartProps> = ({ readonly = false }) => {
  const { getActiveProject, addTask, updateProject, updateTask, reorderTask, undo, redo, undoStack, redoStack } = useProjectStore();
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

  const assignees = project.assignees || [];

  const projectStart = new Date(project.startDate);
  const taskDates = project.tasks.flatMap(t => [
    t.manualStartDate || t.calculatedStartDate,
    t.calculatedEndDate,
  ].filter(Boolean) as string[]);
  const earliestTask = taskDates.length ? new Date(taskDates.sort()[0]) : projectStart;
  const latestTask = taskDates.length ? new Date(taskDates.sort().reverse()[0]) : projectStart;
  const timelineStart = addDays(earliestTask, -2);
  const rawDays = differenceInDays(latestTask, timelineStart) + 15;
  const totalDays = Math.max(rawDays, 30);

  const workingDaysSet = new Set(project.config.workingDays || [1, 2, 3, 4, 5]);
  const holidaySet = new Set(Object.keys(project.config.holidays || {}));

  const isWorkingDay = (date: Date) => {
    const day = date.getDay();
    const dateString = date.toISOString().split('T')[0];
    if (!workingDaysSet.has(day)) return false;
    if (holidaySet.has(dateString)) return false;
    return true;
  };

  // Auto-expand name column width
  const nameColWidth = useMemo(() => calcMinNameWidth(project.tasks), [project.tasks]);
  const LEFT_TOTAL = DRAG_HANDLE_WIDTH + nameColWidth + STATUS_COL_WIDTH + ASSIGNEE_COL_WIDTH + NOTES_COL_WIDTH;

  // Resizable column — only auto-width on initial mount
  const [resizingColumn, setResizingColumn] = useState(false);
  const [colWidth, setColWidth] = useState(nameColWidth);
  const initialColRef = useRef(false);

  useEffect(() => {
    if (!initialColRef.current) {
      setColWidth(nameColWidth);
      initialColRef.current = true;
    }
  }, [nameColWidth]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          redo();
        } else if (!e.shiftKey) {
          e.preventDefault();
          undo();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  const handleColResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setResizingColumn(true);
    const startX = e.clientX;
    const startW = colWidth;

    const handleMouseMove = (ev: MouseEvent) => {
      const delta = ev.clientX - startX;
      setColWidth(Math.max(100, Math.min(600, startW + delta)));
    };
    const handleMouseUp = () => {
      setResizingColumn(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [colWidth]);

  const hasChildren = (taskId: string) => project.tasks.some((t) => t.parentId === taskId);
  const toggleCollapse = (taskId: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
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

    const newTaskId = `t${Date.now()}`;
    const duration = parentId ? 3 : 3;

    addTask({
      id: newTaskId,
      name: parentId ? 'งานย่อยใหม่' : 'งานใหม่',
      duration,
      dependencies: [],
      ...(parentId ? { parentId } : {}),
      ...(nextDate ? { manualStartDate: nextDate } : {}),
    });

    // Auto-open edit modal after a tick (so the task exists in the store)
    setTimeout(() => {
      const proj = getActiveProject();
      const newTask = proj?.tasks.find(t => t.id === newTaskId);
      if (newTask) setEditingTask(newTask);
    }, 50);
  };

  const handleAddHeading = () => {
    const newTaskId = `t${Date.now()}`;
    addTask({
      id: newTaskId,
      name: 'หัวข้อใหม่',
      type: 'heading',
      duration: 0,
      dependencies: [],
    });
    setTimeout(() => {
      const proj = getActiveProject();
      const newTask = proj?.tasks.find(t => t.id === newTaskId);
      if (newTask) setEditingTask(newTask);
    }, 50);
  };

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
    const xInName = e.clientX - rect.left - DRAG_HANDLE_WIDTH;
    const xRatio = xInName / colWidth;
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
    const xInName = e.clientX - rect.left - DRAG_HANDLE_WIDTH;
    const xRatio = xInName / colWidth;
    const draggedTask = project.tasks.find(t => t.id === dragTaskId);
    const targetNode = visibleNodes.find(n => n.task.id === targetTaskId);
    if (!draggedTask || !targetNode) return;
    if (xRatio > 0.6) {
      updateTask(dragTaskId, { parentId: targetTaskId });
    } else {
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

  const barDragRef = React.useRef<{ taskId: string; startX: number; origManualStart: string; shiftKey: boolean; } | null>(null);
  const [barDragOffset, setBarDragOffset] = useState(0);

  const bodyScrollRef = useRef<HTMLDivElement>(null);
  const leftBodyRef = useRef<HTMLDivElement>(null);
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const syncScroll = useCallback(() => {
    if (!bodyScrollRef.current || !leftBodyRef.current || !headerScrollRef.current) return;
    const { scrollTop, scrollLeft } = bodyScrollRef.current;
    leftBodyRef.current.scrollTop = scrollTop;
    headerScrollRef.current.scrollLeft = scrollLeft;
  }, []);

  const handleBarMouseDown = (e: React.MouseEvent, task: Task) => {
    if (readonly || task.type === 'heading') return;
    e.stopPropagation();
    e.preventDefault();
    barDragRef.current = {
      taskId: task.id,
      startX: e.clientX,
      origManualStart: task.manualStartDate || task.calculatedStartDate || '',
      shiftKey: e.shiftKey,
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
          updateTask(drag.taskId, { manualStartDate: d.toISOString().split('T')[0] }, !drag.shiftKey);
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
      <div className="flex-1 bg-white rounded-xl border border-slate-200/80 card-shadow flex flex-col" style={{ overflow: 'clip' }}>
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-gradient-to-r from-slate-50/90 to-white">
          <div className="flex items-center gap-3">
            {!readonly && (
              <>
                <button onClick={() => handleAddTask()} className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white text-xs font-bold rounded-lg hover:from-blue-700 hover:to-blue-600 transition-all shadow-sm active:scale-95">
                  <Plus size={14} /> เพิ่มงาน
                </button>
                <button onClick={handleAddHeading} className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white text-xs font-bold rounded-lg hover:from-emerald-700 hover:to-emerald-600 transition-all shadow-sm active:scale-95">
                  <List size={14} /> เพิ่มหัวข้อ
                </button>
              </>
            )}
            {!readonly && <div className="w-px h-5 bg-slate-200" />}
            <button onClick={() => undo()} disabled={undoStack.length === 0} className="flex items-center gap-1 px-2 py-1.5 text-[10px] font-semibold text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none" title="ย้อนกลับ (Ctrl+Z)">
              <Undo2 size={14} />
            </button>
            <button onClick={() => redo()} disabled={redoStack.length === 0} className="flex items-center gap-1 px-2 py-1.5 text-[10px] font-semibold text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none" title="ทำซ้ำ (Ctrl+Shift+Z)">
              <Redo2 size={14} />
            </button>
            <div className="w-px h-5 bg-slate-200" />
            <button onClick={() => setShowExtraCols(v => !v)} className="flex items-center gap-1 px-2 py-1.5 text-[10px] font-semibold text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all active:scale-95" title={showExtraCols ? 'ซ่อนคอลัมน์' : 'แสดงคอลัมน์'}>
              {showExtraCols ? 'ซ่อน' : 'แสดง'}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Calendar size={12} className="text-slate-400" />
            <span className="text-[10px] font-semibold text-slate-400">เริ่ม:</span>
            <input type="date" value={project.startDate} onChange={(e) => updateProject({ startDate: e.target.value })}
              className="text-xs font-semibold text-slate-600 focus:outline-none bg-transparent"
            />
          </div>
        </div>

        <div id="gantt-export-area" className="flex-1 flex flex-col min-h-0 bg-white">
          <div className="px-4 py-1.5 border-b border-slate-100 bg-slate-50">
            <span className="text-[11px] font-bold text-slate-500">{project.name}</span>
          </div>
          {/* HEADER ROW (fixed, outside scroll) */}
          <div className="flex shrink-0 border-b border-slate-100">
            {/* LEFT HEADER */}
            <div className="flex shrink-0 bg-white" style={{ width: showExtraCols ? LEFT_TOTAL - nameColWidth + colWidth : DRAG_HANDLE_WIDTH + colWidth, minWidth: showExtraCols ? LEFT_TOTAL - nameColWidth + colWidth : DRAG_HANDLE_WIDTH + colWidth, height: HEADER_HEIGHT }}>
                {!readonly && <div style={{ width: DRAG_HANDLE_WIDTH, minWidth: DRAG_HANDLE_WIDTH }} />}
                <div className="flex items-center px-4 text-[10px] font-bold text-slate-400 tracking-wider relative" style={{ width: colWidth, minWidth: colWidth }}>
                  ชื่องาน
                  {!readonly && (
                    <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 active:bg-blue-600 z-10"
                      onMouseDown={handleColResizeStart}
                      style={{ background: resizingColumn ? '#3b82f6' : 'transparent' }}
                    />
                  )}
                </div>
                {showExtraCols && <>
                  <div className="flex items-center px-3 text-[10px] font-bold text-slate-400 tracking-wider border-l border-slate-100/80" style={{ width: STATUS_COL_WIDTH }}>สถานะ</div>
                  <div className="flex items-center px-3 text-[10px] font-bold text-slate-400 tracking-wider border-l border-slate-100/80" style={{ width: ASSIGNEE_COL_WIDTH }}>ผู้รับผิดชอบ</div>
                  <div className="flex items-center px-3 text-[10px] font-bold text-slate-400 tracking-wider border-l border-slate-100/80" style={{ width: NOTES_COL_WIDTH }}>หมายเหตุ</div>
                </>}
              </div>
              {/* RIGHT HEADER */}
              <div ref={headerScrollRef} data-gantt-right-header className="overflow-hidden bg-white flex-1" style={{ height: HEADER_HEIGHT }}>
                {/* Month row */}
                <div className="flex text-[10px] font-bold text-slate-400" style={{ width: totalDays * DAY_WIDTH, height: 18 }}>
                  {(() => {
                    const segments: { month: number; year: number; start: number; width: number; isLast: boolean }[] = [];
                    let i = 0;
                    while (i < totalDays) {
                      const d = addDays(timelineStart, i);
                      const m = d.getMonth();
                      const y = d.getFullYear();
                      const start = i;
                      let count = 0;
                      while (i < totalDays) {
                        const dd = addDays(timelineStart, i);
                        if (dd.getMonth() !== m || dd.getFullYear() !== y) break;
                        count++;
                        i++;
                      }
                      segments.push({ month: m, year: y, start, width: count * DAY_WIDTH, isLast: i >= totalDays });
                    }
                    return segments.map((seg, si) => (
                      <div key={si} className={`flex items-center justify-center bg-slate-50/50 text-[10px] font-bold text-slate-500 ${si < segments.length - 1 ? 'border-r-2 border-r-slate-300' : 'border-r border-slate-100/80'}`}
                        style={{ width: seg.width, minWidth: seg.width }}
                      >
                        {`${THAI_MONTHS[seg.month].replace('.', '')} ${seg.year + 543}`}
                      </div>
                    ));
                  })()}
                </div>
                {/* Day row */}
                <div className="flex" style={{ width: totalDays * DAY_WIDTH, height: 22 }}>
                  {Array.from({ length: totalDays }).map((_, i) => {
                    const date = addDays(timelineStart, i);
                    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                    const dateString = date.toISOString().split('T')[0];
                    const isHoliday = project.config.holidays && dateString in project.config.holidays;
                    return (
                      <div key={i}
                        className={`flex-shrink-0 border-r border-slate-100/80 flex flex-col items-center justify-center text-[10px] font-medium leading-tight ${
                          isHoliday ? 'bg-rose-100/70 text-rose-600' : isWeekend ? 'bg-slate-200/60 text-slate-500' : 'text-slate-500'
                        }`}
                        style={{ width: DAY_WIDTH }}
                      >
                        <span>{THAI_DAYS[date.getDay()]}</span>
                        <span className="font-semibold">{date.getDate()}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          {/* BODY ROW (scrollable) */}
          <div className="flex flex-1 min-h-0">
            {/* LEFT BODY */}
            <div ref={leftBodyRef} data-gantt-left-body className="overflow-hidden border-r border-slate-200/80 bg-white" style={{ width: showExtraCols ? LEFT_TOTAL - nameColWidth + colWidth : DRAG_HANDLE_WIDTH + colWidth, minWidth: showExtraCols ? LEFT_TOTAL - nameColWidth + colWidth : DRAG_HANDLE_WIDTH + colWidth }}>
  
                {/* Task Rows */}
                {visibleNodes.map(({ task, depth }) => {
                  const isHeading = task.type === 'heading';
                  const childCount = hasChildren(task.id);
                  const dropPos = dragOverTaskId?.startsWith(task.id + ':') ? dragOverTaskId.split(':')[1] as 'before' | 'after' | 'child' | undefined : undefined;
                  const statusMeta = STATUS_OPTIONS.find(s => s.value === (task.status || 'pending'));

                  return (
                    <div key={task.id}
                      className={`flex border-b border-slate-50/80 transition-colors group ${readonly ? '' : 'hover:bg-blue-50/40'} ${depth === 0 ? 'bg-white' : 'bg-slate-50/30'} ${dragTaskId === task.id ? 'opacity-40' : ''} ${isHeading ? 'bg-indigo-50/30 border-l-2 border-l-indigo-300' : ''}`}
                      style={{ height: ROW_HEIGHT }}
                      onDragOver={(e) => handleDragOver(e, task.id)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, task.id)}
                    >
                      {!readonly && (
                        <div
                          draggable
                          onDragStart={(e) => handleDragStart(e, task.id)}
                          onDragEnd={handleDragEnd}
                          className="flex items-center justify-center cursor-grab active:cursor-grabbing shrink-0 text-slate-300 hover:text-slate-500 transition-colors"
                          style={{ width: DRAG_HANDLE_WIDTH, minWidth: DRAG_HANDLE_WIDTH }}
                        >
                          <GripVertical size={16} />
                        </div>
                      )}
                      <div onClick={() => !readonly && setEditingTask(task)}
                        className="flex items-center px-2 cursor-pointer" style={{ width: colWidth, minWidth: colWidth, paddingLeft: 8 + depth * 20 }}
                      >
                        {dropPos === 'before' && <div className="absolute left-0 right-0 top-0 h-0.5 bg-blue-500 z-10" />}
                        {dropPos === 'after' && <div className="absolute left-0 right-0 bottom-0 h-0.5 bg-blue-500 z-10" />}
                        {dropPos === 'child' && <div className="absolute left-0 right-0 inset-y-0 border-2 border-blue-400/60 rounded-lg z-10" />}

                        {childCount ? (
                          <button onClick={(e) => { e.stopPropagation(); toggleCollapse(task.id); }} className="p-0.5 mr-1 text-slate-400 hover:text-slate-600 shrink-0">
                            {collapsed.has(task.id) ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                          </button>
                        ) : (depth > 0 && !isHeading && <span className="w-[22px] shrink-0" />)}

                        {isHeading && <Layers size={14} className="mr-1.5 text-indigo-400 shrink-0" />}

                        <span className={`text-xs font-semibold truncate flex-1 min-w-0 ${isHeading ? 'text-indigo-700' : depth > 0 ? 'text-slate-500 group-hover:text-emerald-600' : 'text-slate-700 group-hover:text-blue-600'}`}>
                          {task.name}
                        </span>

                        {!readonly && (
                          <button onClick={(e) => { e.stopPropagation(); handleAddTask(task.id); }}
                            className={`p-1 rounded opacity-0 group-hover:opacity-100 transition-all shrink-0 ${depth > 0 ? 'text-slate-300 hover:text-emerald-600 hover:bg-emerald-50' : 'text-slate-300 hover:text-blue-600 hover:bg-blue-50'}`}
                            title="เพิ่มงานย่อย">
                            <Plus size={14} />
                          </button>
                        )}
                      </div>

                      {showExtraCols && <>
                        <div className="flex items-center px-2 border-l border-slate-100/80" style={{ width: STATUS_COL_WIDTH, minWidth: STATUS_COL_WIDTH }}>
                          {readonly ? (
                            <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: statusMeta?.color }} />
                              {statusMeta?.label}
                            </span>
                          ) : isHeading ? (
                            <span className="text-xs text-slate-400 italic">-</span>
                          ) : (
                            <>
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: statusMeta?.color }} />
                              <select value={task.status || 'pending'} onChange={(e) => updateTask(task.id, { status: e.target.value })}
                                onClick={(e) => e.stopPropagation()}
                                className="flex-1 text-xs font-semibold text-slate-700 bg-transparent border border-transparent hover:border-slate-200 rounded-lg px-1.5 py-1 focus:outline-none focus:border-blue-400 focus:bg-white transition-all cursor-pointer"
                              >
                                {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                              </select>
                            </>
                          )}
                        </div>

                        <div className="flex items-center px-2 border-l border-slate-100/80" style={{ width: ASSIGNEE_COL_WIDTH, minWidth: ASSIGNEE_COL_WIDTH }}>
                          {readonly ? (
                            <span className="text-xs text-slate-600 truncate">{task.assignee || '-'}</span>
                          ) : isHeading ? (
                            <span className="text-xs text-slate-400 italic">-</span>
                          ) : (
                            <select value={task.assignee || ''} onChange={(e) => {
                              const newAssignee = e.target.value || undefined;
                              const assigneeColor = assignees.find(a => a.name === newAssignee)?.color;
                              updateTask(task.id, { assignee: newAssignee, color: assigneeColor || undefined });
                            }}
                              onClick={(e) => e.stopPropagation()}
                              className="w-full text-xs font-semibold text-slate-700 bg-transparent border border-transparent hover:border-slate-200 rounded-lg px-1.5 py-1 focus:outline-none focus:border-blue-400 focus:bg-white transition-all cursor-pointer"
                            >
                              <option value="">-</option>
                              {assignees.map(a => <option key={a.name} value={a.name}>{a.name}</option>)}
                            </select>
                          )}
                        </div>

                        <div className="flex items-center px-2 border-l border-slate-100/80" style={{ width: NOTES_COL_WIDTH, minWidth: NOTES_COL_WIDTH }}>
                          {readonly ? (
                            <span className="text-xs text-slate-600 truncate">{task.notes || '-'}</span>
                          ) : isHeading ? (
                            <span className="text-xs text-slate-400 italic">-</span>
                          ) : (
                            <input type="text" defaultValue={task.notes || ''}
                              onBlur={(e) => updateTask(task.id, { notes: e.target.value || undefined })}
                              onClick={(e) => e.stopPropagation()} placeholder="-"
                              className="w-full text-xs text-slate-700 bg-transparent border border-transparent hover:border-slate-200 rounded-lg px-1.5 py-1 focus:outline-none focus:border-blue-400 focus:bg-white transition-all"
                            />
                          )}
                        </div>
                      </>}
                    </div>
                  );
                })}
              </div>
            {/* RIGHT BODY */}
            <div ref={bodyScrollRef} data-gantt-right-body className="flex-1 overflow-auto" onScroll={syncScroll}>
              <div className="relative" style={{ width: totalDays * DAY_WIDTH }}>
                {visibleNodes.map(({ task, depth }) => {
                  const isHeading = task.type === 'heading';
                  const hasCalc = !isHeading && task.calculatedStartDate && task.calculatedEndDate;

                  return (
                    <div key={task.id}
                      className={`relative border-b border-slate-50/80 hover:bg-blue-50/20 transition-colors ${depth === 0 ? 'bg-white' : 'bg-slate-50/30'} ${isHeading ? 'bg-indigo-50/30' : ''}`}
                      style={{ height: ROW_HEIGHT }}
                    >
                      {Array.from({ length: totalDays }).map((_, i) => {
                        const date = addDays(timelineStart, i);
                        const dateString = date.toISOString().split('T')[0];
                        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                        const isHoliday = project.config.holidays && dateString in project.config.holidays;
                        if (!isWeekend && !isHoliday) return null;
                        const bgClass = isHoliday ? 'bg-rose-100/60' : 'bg-slate-200/50';
                        return <div key={i} className={`absolute top-0 bottom-0 ${bgClass} border-r border-white/60`} style={{ left: i * DAY_WIDTH, width: DAY_WIDTH }} />;
                      })}

                      {depth > 0 && !isHeading && (
                        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-200/60" style={{ left: depth * 20 - 8 }} />
                      )}

                      {hasCalc && (() => {
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
                          if (cur === prev + 1) { prev = cur; continue; }
                          segments.push({ startIdx: segStart, length: prev - segStart + 1 });
                          segStart = cur;
                          prev = cur;
                        }
                        segments.push({ startIdx: segStart, length: prev - segStart + 1 });

                        const barColor = getBarColor(task, depth, project.config.defaultBarColor, assignees);
                        const barLighter = lightenColor(barColor, 60);

                        return segments.map((s, si) => {
                          const isDragging = barDragRef.current?.taskId === task.id;
                          return (
                            <div key={si}
                              title={`${task.name}\n${formatThaiDate(task.calculatedStartDate!)} – ${formatThaiDate(task.calculatedEndDate!)}`}
                              className={`absolute h-8 flex items-center px-2.5 hover:brightness-110 transition-shadow ${readonly ? 'cursor-default' : 'cursor-ew-resize active:shadow-lg'} ${isDragging ? 'shadow-xl brightness-110 z-20' : ''}`}
                              style={{
                                left: s.startIdx * DAY_WIDTH, width: s.length * DAY_WIDTH, top: barTop,
                                transform: isDragging && barDragOffset ? `translateX(${barDragOffset * DAY_WIDTH}px)` : '',
                                background: `linear-gradient(135deg, ${barColor}, ${lightenColor(barColor, 30)})`,
                                borderRadius: '8px', boxShadow: `0 2px 6px ${barColor}40`, border: `1px solid ${barLighter}`,
                              }}
                              onMouseDown={(e) => !readonly && handleBarMouseDown(e, task)}
                            />
                          );
                        });
                      })()}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {!readonly && editingTask && <TaskEditModal key={editingTask.id} task={editingTask} onClose={() => setEditingTask(null)} />}
    </>
  );
};
