import { ProjectConfig } from '../../types/project';

export class HolidayEngine {
  private workingDays: Set<number>;
  private holidays: Set<string>;

  constructor(config: ProjectConfig) {
    this.workingDays = new Set(config.workingDays);
    this.holidays = new Set(Object.keys(config.holidays));
  }

  /**
   * Checks if a specific date is a working day.
   */
  isWorkingDay(date: Date): boolean {
    const dayOfWeek = date.getDay();
    const dateString = date.toISOString().split('T')[0];

    // Check if it's a weekend/non-working day
    if (!this.workingDays.has(dayOfWeek)) {
      return false;
    }

    // Check if it's a specific holiday
    if (this.holidays.has(dateString)) {
      return false;
    }

    return true;
  }

  /**
   * Moves a date to the next available working day if it is not one.
   */
  moveToNextWorkingDay(date: Date): Date {
    const nextDate = new Date(date);
    let iterations = 0;
    while (!this.isWorkingDay(nextDate) && iterations < 365) {
      nextDate.setDate(nextDate.getDate() + 1);
      iterations++;
    }
    return nextDate;
  }

  /**
   * Adds a number of working days to a start date.
   * Duration of 1 means the task starts and ends on the same day.
   */
  addWorkingDays(startDate: Date, duration: number): Date {
    if (duration <= 0) return new Date(startDate);

    // Ensure we start on a working day
    let currentDate = this.moveToNextWorkingDay(startDate);
    
    let remainingDays = duration;
    
    // If duration is 1, we are done (ends on start date)
    while (remainingDays > 1) {
      currentDate.setDate(currentDate.getDate() + 1);
      if (this.isWorkingDay(currentDate)) {
        remainingDays--;
      }
    }

    return currentDate;
  }

  /**
   * Counts working days between two dates (inclusive).
   */
  countWorkingDays(startDate: Date, endDate: Date): number {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);

    let count = 0;
    const current = new Date(start);
    while (current <= end) {
      if (this.isWorkingDay(current)) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }
    return count;
  }
}
