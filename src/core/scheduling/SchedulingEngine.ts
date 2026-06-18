import { Project, Task } from '../../types/project';
import { HolidayEngine } from '../calendar/HolidayEngine';

export class SchedulingEngine {
  private holidayEngine: HolidayEngine;

  constructor(holidayEngine: HolidayEngine) {
    this.holidayEngine = holidayEngine;
  }

  /**
   * Calculates the timeline for all tasks in a project.
   */
  calculate(project: Project): Task[] {
    const tasks = [...project.tasks];
    const projectStartDate = new Date(project.startDate);
    
    // Reset calculated dates
    tasks.forEach(task => {
      task.calculatedStartDate = undefined;
      task.calculatedEndDate = undefined;
    });

    const resolvedTaskIds = new Set<string>();
    let changed = true;
    let iterations = 0;
    const MAX_ITERATIONS = tasks.length * 2; // Guard against cycles

    while (changed && iterations < MAX_ITERATIONS) {
      changed = false;
      iterations++;

      for (const task of tasks) {
        if (resolvedTaskIds.has(task.id)) continue;

        // Check if all dependencies are resolved
        const dependencies = tasks.filter(t => task.dependencies.includes(t.id));
        const allDepsResolved = dependencies.every(d => resolvedTaskIds.has(d.id));

        if (allDepsResolved) {
          // Calculate potential start date from dependencies
          let dependencyStartDate: Date;
          if (dependencies.length === 0) {
            dependencyStartDate = new Date(projectStartDate);
          } else {
            const latestDepEndDate = new Date(
              Math.max(...dependencies.map(d => new Date(d.calculatedEndDate!).getTime()))
            );
            const nextDay = new Date(latestDepEndDate);
            nextDay.setDate(nextDay.getDate() + 1);
            dependencyStartDate = nextDay;
          }

          // Respect manual override if it exists
          let startDate = dependencyStartDate;
          if (task.manualStartDate) {
            const manualDate = new Date(task.manualStartDate);
            // We use the manual date if it is later than the dependency start date
            // or if we want to force it to that specific date.
            // Requirement usually implies "Manual" means "exactly then" or "no earlier than".
            // Let's go with "Manual date" taking precedence.
            startDate = manualDate;
          }

          // Ensure start date is a working day
          startDate = this.holidayEngine.moveToNextWorkingDay(startDate);
          
          // Calculate end date
          const endDate = this.holidayEngine.addWorkingDays(startDate, task.duration);

          task.calculatedStartDate = startDate.toISOString().split('T')[0];
          task.calculatedEndDate = endDate.toISOString().split('T')[0];
          
          resolvedTaskIds.add(task.id);
          changed = true;
        }
      }
    }

    if (resolvedTaskIds.size < tasks.length) {
      console.warn('Circular dependency detected or some tasks could not be resolved.');
    }

    return tasks;
  }
}
