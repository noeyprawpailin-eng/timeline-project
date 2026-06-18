import { Project, Task } from '../../../types/project';
import { HolidayEngine } from '../../../core/calendar/HolidayEngine';
import { SchedulingEngine } from '../../../core/scheduling/SchedulingEngine';

export class TimelineService {
  /**
   * Orchestrates the calculation of a project timeline.
   */
  static calculateTimeline(project: Project): Project {
    const holidayEngine = new HolidayEngine(project.config);
    const schedulingEngine = new SchedulingEngine(holidayEngine);

    const updatedTasks = schedulingEngine.calculate(project);

    return {
      ...project,
      tasks: updatedTasks
    };
  }

  /**
   * Utility to create a new task with default values.
   */
  static createDefaultTask(id: string): Task {
    return {
      id,
      name: 'New Task',
      duration: 1,
      dependencies: [],
    };
  }

  /**
   * Updates a project by re-calculating everything after a change.
   */
  static updateProject(project: Project, updates: Partial<Project>): Project {
    const updatedProject = { ...project, ...updates };
    return this.calculateTimeline(updatedProject);
  }
}
