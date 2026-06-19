export interface Project {
  ownerId?: string;
  id: string;
  name: string;
  startDate: string; // ISO format
  config: ProjectConfig;
  tasks: Task[];
  assignees: Assignee[];
}

export interface Assignee {
  name: string;
  color: string;
}

export interface ProjectConfig {
  workingDays: number[]; // 0 for Sunday, 1 for Monday, etc. Default [1, 2, 3, 4, 5]
  holidays: Record<string, string>;    // ISO Date -> Holiday Name (e.g., "2026-01-01" -> "New Year's Day")
  defaultBarColor?: string; // Default bar color; if not set, root=blue, child=emerald
}

export type TaskType = 'task' | 'heading';

export interface Task {
  id: string;
  parentId?: string;      // Support for grouped tasks/phases
  name: string;
  type?: TaskType;        // 'task' (default) or 'heading'
  duration: number;       // In working days
  dependencies: string[];  // Array of Task IDs
  manualStartDate?: string; // Optional manual override for start date
  color?: string;         // Individual bar color override
  status?: string;        // pending | in_progress | completed | overdue | cancelled
  assignee?: string;      // Person responsible (name matching project.assignees)
  notes?: string;         // Notes / remarks
  
  // Calculated fields (populated by SchedulingEngine)
  calculatedStartDate?: string;
  calculatedEndDate?: string;
  isMilestone?: boolean;
}
