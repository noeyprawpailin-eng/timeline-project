'use client';

import React, { useState, useMemo } from 'react';
import { useProjectStore } from '../store/useProjectStore';
import { Plus, Calendar } from 'lucide-react';
import { Task } from '../../../types/project';
import { TaskEditModal } from './TaskEditModal';

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

export const TaskSidebar: React.FC = () => {
  const { getActiveProject, addTask, updateProject } = useProjectStore();
  const project = getActiveProject();
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  if (!project) return null;

  const hierarchy = useMemo(() => buildHierarchy(project.tasks), [project.tasks]);

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

    addTask({
      id: `t${Date.now()}`,
      name: parentId ? 'งานย่อยใหม่' : 'งานใหม่',
      duration: 3,
      dependencies: [],
      ...(parentId ? { parentId } : {}),
      ...(nextDate ? { manualStartDate: nextDate } : {}),
    });
  };

  return (
    <>
      <div className="w-56 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h2 className="text-sm font-bold text-slate-700 tracking-tight">งาน</h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleAddTask()}
              className="p-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-all shadow-sm active:scale-95"
              title="เพิ่มงาน"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>

        {/* Project Start Date - compact */}
        <div className="px-4 py-2 border-b border-slate-100 flex items-center gap-2">
          <Calendar size={12} className="text-slate-400" />
          <input
            type="date"
            value={project.startDate}
            onChange={(e) => updateProject({ startDate: e.target.value })}
            className="text-[11px] font-medium text-slate-600 focus:outline-none bg-transparent w-full"
          />
        </div>

        {/* Timeline Header */}
        <div className="h-[50px] border-b border-slate-100 flex items-center px-4">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ชื่องาน</span>
        </div>

        {/* Task Names */}
        <div className="flex-1 overflow-y-auto">
          {hierarchy.map(({ task, depth }) => (
            <div
              key={task.id}
              onClick={() => setEditingTask(task)}
              className="h-14 flex items-center border-b border-slate-50 cursor-pointer hover:bg-blue-50/50 transition-colors group"
              style={{ paddingLeft: 12 + depth * 20 }}
            >
              <span className="text-sm font-semibold text-slate-700 truncate group-hover:text-blue-600 transition-colors flex-1 min-w-0">
                {task.name}
              </span>
              {depth === 0 && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleAddTask(task.id); }}
                  className="p-1 text-slate-300 hover:text-blue-600 rounded opacity-0 group-hover:opacity-100 transition-all shrink-0 mr-1"
                  title="เพิ่มงานย่อย"
                >
                  <Plus size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Edit Modal */}
      {editingTask && (
        <TaskEditModal
          key={editingTask.id}
          task={editingTask}
          onClose={() => setEditingTask(null)}
        />
      )}
    </>
  );
};
