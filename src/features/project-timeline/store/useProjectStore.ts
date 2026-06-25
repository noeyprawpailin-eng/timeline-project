import { create } from 'zustand';
import { Project, Task } from '../../../types/project';
import { TimelineService } from '../services/TimelineService';
import { firestoreService } from '../services/firestoreService';
import { getAllThaiHolidays } from '../../../core/calendar/thaiHolidays';

function buildOrderedIds(tasks: Task[]): string[] {
  const roots = tasks.filter(t => !t.parentId);
  const result: string[] = [];
  function walk(parentId: string | undefined) {
    for (const t of tasks) {
      if (t.parentId === parentId) {
        result.push(t.id);
        walk(t.id);
      }
    }
  }
  for (const r of roots) {
    result.push(r.id);
    walk(r.id);
  }
  const visited = new Set(result);
  for (const t of tasks) {
    if (!visited.has(t.id)) result.push(t.id);
  }
  return result;
}

function daysDiff(a: string, b: string): number {
  return Math.round((new Date(a).getTime() - new Date(b).getTime()) / (1000 * 60 * 60 * 24));
}

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

interface ProjectState {
  projects: Project[];
  activeProjectId: string | null;
  globalHolidays: Record<string, string>;
  loading: boolean;
  error: string | null;

  // Undo/Redo
  undoStack: Project[];
  redoStack: Project[];
  pushSnapshot: () => void;
  undo: () => Promise<void>;
  redo: () => Promise<void>;

  // Lifecycle
  loadProjects: () => Promise<void>;
  setProjects: (projects: Project[]) => void;
  setActiveProject: (project: Project) => void;

  // Project Management
  createProject: (name: string, startDate: string, assignees?: { name: string; color: string }[]) => Promise<void>;
  selectProject: (id: string | null) => void;
  updateAssignees: (id: string, assignees: { name: string; color: string }[], renameMap?: Record<string, string>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  duplicateProject: (id: string) => Promise<void>;
  renameProject: (id: string, name: string) => Promise<void>;
  clearError: () => void;

  // Task Management (for active project)
  updateTask: (taskId: string, updates: Partial<Task>, skipAutoShift?: boolean) => Promise<void>;
  updateProject: (updates: Partial<Project>) => Promise<void>;
  addTask: (task: Task) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  recalculate: () => void;
  reorderTask: (taskId: string, targetTaskId: string, position: 'before' | 'after') => Promise<void>;

  // Selectors
  getActiveProject: () => Project | undefined;

  // Global Holiday management
  addGlobalHoliday: (dateString: string, name: string) => Promise<void>;
  removeGlobalHoliday: (dateString: string) => Promise<void>;
}

const INITIAL_THAI_HOLIDAYS = getAllThaiHolidays();

function syncProject(p: Project): void {
  if (p.id) {
    firestoreService.saveProject(p.id, p).catch(console.error);
  }
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  activeProjectId: null,
  globalHolidays: INITIAL_THAI_HOLIDAYS,
  loading: true,
  error: null,
  undoStack: [],
  redoStack: [],

  pushSnapshot: () => {
    const { projects, activeProjectId } = get();
    const project = projects.find(p => p.id === activeProjectId);
    if (!project) return;
    set((s) => ({
      undoStack: [...s.undoStack.slice(-49), JSON.parse(JSON.stringify(project))],
      redoStack: [],
    }));
  },

  undo: async () => {
    const { projects, activeProjectId, undoStack, redoStack } = get();
    if (undoStack.length === 0 || !activeProjectId) return;
    const snapshot = undoStack[undoStack.length - 1];
    const current = projects.find(p => p.id === activeProjectId);
    if (!current) return;
    set({
      projects: projects.map(p => p.id === activeProjectId ? snapshot : p),
      undoStack: undoStack.slice(0, -1),
      redoStack: [...redoStack, JSON.parse(JSON.stringify(current))],
    });
    syncProject(snapshot);
  },

  redo: async () => {
    const { projects, activeProjectId, undoStack, redoStack } = get();
    if (redoStack.length === 0 || !activeProjectId) return;
    const snapshot = redoStack[redoStack.length - 1];
    const current = projects.find(p => p.id === activeProjectId);
    if (!current) return;
    set({
      projects: projects.map(p => p.id === activeProjectId ? snapshot : p),
      undoStack: [...undoStack, JSON.parse(JSON.stringify(current))],
      redoStack: redoStack.slice(0, -1),
    });
    syncProject(snapshot);
  },

  loadProjects: async () => {
    try {
      const [projects, firebaseHolidays] = await Promise.all([
        firestoreService.loadProjects(),
        firestoreService.loadHolidays(),
      ]);
      const mergedHolidays = { ...INITIAL_THAI_HOLIDAYS, ...firebaseHolidays };
      const calculated = projects.map((p) =>
        TimelineService.calculateTimeline({
          ...p,

          config: { ...p.config, holidays: { ...mergedHolidays } },
        })
      );
      set({ projects: calculated, globalHolidays: mergedHolidays, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  setProjects: (projects) => set({ projects }),
  setActiveProject: (project: Project) => set((state) => ({
    projects: state.projects.some(p => p.id === project.id)
      ? state.projects.map(p => p.id === project.id ? project : p)
      : [...state.projects, project],
    activeProjectId: project.id,
  })),

  createProject: async (name, startDate, assignees?) => {
    const id = `proj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const newProject = TimelineService.calculateTimeline({
      id,
      name,
      startDate,
      config: { workingDays: [1, 2, 3, 4, 5], holidays: { ...get().globalHolidays } },
      tasks: [],
      assignees: assignees || [],

    });

    await firestoreService.createProject(newProject);
    set((state) => ({
      projects: [...state.projects, newProject],
      activeProjectId: newProject.id,
    }));
  },

  selectProject: (id) => set({ activeProjectId: id }),
  clearError: () => set({ error: null }),

  updateAssignees: async (id, assignees, renameMap?) => {
    try {
      get().pushSnapshot();
      const state = get();
      const project = state.projects.find(p => p.id === id);
      if (!project) return;
      let tasks = project.tasks;
      if (renameMap) {
        tasks = tasks.map(t => {
          const newName = t.assignee ? renameMap[t.assignee] : undefined;
          return newName ? { ...t, assignee: newName } : t;
        });
      }
      const updated = TimelineService.calculateTimeline({ ...project, assignees, tasks });
      await firestoreService.saveProject(id, updated);
      set((s) => ({
        projects: s.projects.map(p => p.id === id ? updated : p),
      }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[Update Assignees Error]', msg);
      set({ error: msg });
    }
  },

  deleteProject: async (id) => {
    try {
      await firestoreService.deleteProject(id);
      set((state) => ({
        projects: state.projects.filter(p => p.id !== id),
        activeProjectId: state.activeProjectId === id ? null : state.activeProjectId,
      }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[Delete Error]', msg);
      set({ error: msg });
    }
  },

  duplicateProject: async (id) => {
    const state = get();
    const source = state.projects.find(p => p.id === id);
    if (!source) return;

    const oldToNew = new Map<string, string>();
    const newTasks = source.tasks.map(t => {
      const newId = `${t.id}_dup_${Date.now()}`;
      oldToNew.set(t.id, newId);
      return { ...t, id: newId };
    }).map(t => ({
      ...t,
      parentId: t.parentId ? oldToNew.get(t.parentId) : undefined,
      dependencies: t.dependencies.map(d => oldToNew.get(d) || d),
    }));

    const dupId = `${source.id}_dup_${Date.now()}`;
    const dup = TimelineService.calculateTimeline({
      ...source,
      id: dupId,
      name: `${source.name} (สำเนา)`,
      tasks: newTasks,
    });

    await firestoreService.createProject(dup);
    set((s) => ({ projects: [...s.projects, dup] }));
  },

  renameProject: async (id, name) => {
    try {
      get().pushSnapshot();
      const state = get();
      const project = state.projects.find(p => p.id === id);
      if (!project) return;
      const updated = { ...project, name };
      await firestoreService.saveProject(id, updated);
      set((s) => ({
        projects: s.projects.map(p => p.id === id ? updated : p),
      }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[Rename Error]', msg);
      set({ error: msg });
    }
  },

  getActiveProject: () => {
    const { projects, activeProjectId } = get();
    return projects.find(p => p.id === activeProjectId);
  },

  updateTask: async (taskId, updates, skipAutoShift) => {
    get().pushSnapshot();
    const state = get();
    const activeProject = state.projects.find(p => p.id === state.activeProjectId);
    if (!activeProject) return;

    const orderedIds = buildOrderedIds(activeProject.tasks);
    const taskIndex = orderedIds.indexOf(taskId);
    const oldTask = activeProject.tasks.find(t => t.id === taskId);

    const updatedTasks = activeProject.tasks.map((t) =>
      t.id === taskId ? { ...t, ...updates } : t
    );
    let updatedProject = TimelineService.calculateTimeline({ ...activeProject, tasks: updatedTasks });

    if (taskIndex >= 0 && oldTask?.calculatedEndDate && !skipAutoShift) {
      const newTask = updatedProject.tasks.find(t => t.id === taskId);
      if (newTask?.calculatedEndDate) {
        const delta = daysDiff(newTask.calculatedEndDate, oldTask.calculatedEndDate);
        if (delta !== 0) {
          const subsequentIds = new Set(orderedIds.slice(taskIndex + 1));
          const shiftedTasks = updatedProject.tasks.map(t =>
            subsequentIds.has(t.id) && t.manualStartDate
              ? { ...t, manualStartDate: shiftDate(t.manualStartDate, delta) }
              : t
          );
          updatedProject = TimelineService.calculateTimeline({ ...activeProject, tasks: shiftedTasks });
        }
      }
    }

    set((s) => ({
      projects: s.projects.map(p => p.id === s.activeProjectId ? updatedProject : p),
    }));
    syncProject(updatedProject);
  },

  updateProject: async (updates) => {
    get().pushSnapshot();
    const state = get();
    const activeProject = state.projects.find(p => p.id === state.activeProjectId);
    if (!activeProject) return;

    const updatedProject = TimelineService.calculateTimeline({ ...activeProject, ...updates });
    set((s) => ({
      projects: s.projects.map(p => p.id === s.activeProjectId ? updatedProject : p),
    }));
    syncProject(updatedProject);
  },

  addTask: async (task) => {
    get().pushSnapshot();
    const state = get();
    const activeProject = state.projects.find(p => p.id === state.activeProjectId);
    if (!activeProject) return;

    const updatedProject = TimelineService.calculateTimeline({
      ...activeProject,
      tasks: [...activeProject.tasks, task],
    });
    set((s) => ({
      projects: s.projects.map(p => p.id === s.activeProjectId ? updatedProject : p),
    }));
    syncProject(updatedProject);
  },

  deleteTask: async (taskId) => {
    get().pushSnapshot();
    const state = get();
    const activeProject = state.projects.find(p => p.id === state.activeProjectId);
    if (!activeProject) return;

    const updatedTasks = activeProject.tasks.filter((t) => t.id !== taskId);
    const cleanedTasks = updatedTasks.map(t => ({
      ...t,
      dependencies: t.dependencies.filter(id => id !== taskId),
    }));

    const updatedProject = TimelineService.calculateTimeline({ ...activeProject, tasks: cleanedTasks });
    set((s) => ({
      projects: s.projects.map(p => p.id === s.activeProjectId ? updatedProject : p),
    }));
    syncProject(updatedProject);
  },

  recalculate: () => {
    const state = get();
    const activeProject = state.projects.find(p => p.id === state.activeProjectId);
    if (!activeProject) return;

    const updatedProject = TimelineService.calculateTimeline(activeProject);
    set((s) => ({
      projects: s.projects.map(p => p.id === s.activeProjectId ? updatedProject : p),
    }));
    syncProject(updatedProject);
  },

  reorderTask: async (taskId, targetTaskId, position) => {
    get().pushSnapshot();
    const state = get();
    const project = state.projects.find(p => p.id === state.activeProjectId);
    if (!project) return;

    const tasks = [...project.tasks];
    const sourceIdx = tasks.findIndex(t => t.id === taskId);
    const targetIdx = tasks.findIndex(t => t.id === targetTaskId);
    if (sourceIdx === -1 || targetIdx === -1) return;

    const [moved] = tasks.splice(sourceIdx, 1);
    const newTargetIdx = tasks.findIndex(t => t.id === targetTaskId);
    tasks.splice(newTargetIdx + (position === 'after' ? 1 : 0), 0, moved);

    const updatedProject = TimelineService.calculateTimeline({ ...project, tasks });
    set((s) => ({
      projects: s.projects.map(p => p.id === s.activeProjectId ? updatedProject : p),
    }));
    syncProject(updatedProject);
  },

  // Global Holiday management
  addGlobalHoliday: async (dateString, name) => {
    await firestoreService.addHoliday(dateString, name);
    set((state) => {
      const newGlobalHolidays = { ...state.globalHolidays, [dateString]: name };
      const updatedProjects = state.projects.map(p =>
        TimelineService.calculateTimeline({ ...p, config: { ...p.config, holidays: newGlobalHolidays } })
      );
      updatedProjects.forEach(syncProject);
      return { globalHolidays: newGlobalHolidays, projects: updatedProjects };
    });
  },

  removeGlobalHoliday: async (dateString) => {
    await firestoreService.removeHoliday(dateString);
    set((state) => {
      const newGlobalHolidays = { ...state.globalHolidays };
      delete newGlobalHolidays[dateString];
      const updatedProjects = state.projects.map(p =>
        TimelineService.calculateTimeline({ ...p, config: { ...p.config, holidays: newGlobalHolidays } })
      );
      updatedProjects.forEach(syncProject);
      return { globalHolidays: newGlobalHolidays, projects: updatedProjects };
    });
  },
}));
