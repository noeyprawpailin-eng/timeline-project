import { Project } from '@/types/project';

export const firestoreService = {
  async loadProjects(): Promise<Project[]> {
    const res = await fetch('/api/projects');
    if (!res.ok) throw new Error('Failed to load projects');
    const data = await res.json();
    return data.projects || [];
  },

  async createProject(project: Project): Promise<Project> {
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(project),
    });
    if (!res.ok) throw new Error('Failed to create project');
    const data = await res.json();
    return data.project;
  },

  async saveProject(id: string, project: Project): Promise<void> {
    const res = await fetch(`/api/projects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(project),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.full || data.error || 'Failed to save project');
    }
  },

  async deleteProject(id: string): Promise<void> {
    const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.full || data.error || 'Failed to delete project');
    }
  },

  async loadHolidays(): Promise<Record<string, string>> {
    const res = await fetch('/api/holidays');
    const data = await res.json();
    return data.holidays || {};
  },

  async addHoliday(date: string, name: string): Promise<void> {
    const res = await fetch('/api/holidays', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, name }),
    });
    if (!res.ok) throw new Error('Failed to add holiday');
  },

  async removeHoliday(date: string): Promise<void> {
    const res = await fetch(`/api/holidays?date=${encodeURIComponent(date)}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to remove holiday');
  },
};
