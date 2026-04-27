export class DateHelper {
  static getStartOfDay(date: Date): Date {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    return startOfDay;
  }

  static getEndOfDay(date: Date): Date {
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    return endOfDay;
  }

  static getStartOfWeek(date: Date): Date {
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay(); // 0 is Sunday, 6 is Saturday
    const diff = startOfWeek.getDate() - day;
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);
    return startOfWeek;
  }

  static getEndOfWeek(date: Date): Date {
    const endOfWeek = new Date(date);
    const day = endOfWeek.getDay();
    const diff = endOfWeek.getDate() + (6 - day);
    endOfWeek.setDate(diff);
    endOfWeek.setHours(23, 59, 59, 999);
    return endOfWeek;
  }

  static getStartOfMonth(date: Date): Date {
    const startOfMonth = new Date(date);
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    return startOfMonth;
  }

  static getEndOfMonth(date: Date): Date {
    const endOfMonth = new Date(date);
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);
    endOfMonth.setDate(0);
    endOfMonth.setHours(23, 59, 59, 999);
    return endOfMonth;
  }

  static getStartOfLastWeek(date: Date): Date {
    const result = new Date(date);
    const day = result.getDay(); // 0 is Sunday, 6 is Saturday
    // Subtract current day index to get this Sunday, then subtract 7 more days
    result.setDate(result.getDate() - day - 7);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  static getEndOfLastWeek(date: Date): Date {
    const result = new Date(date);
    const day = result.getDay();
    // Subtract current day index to get this Sunday, then subtract 1 more day to get last Saturday
    result.setDate(result.getDate() - day - 1);
    result.setHours(23, 59, 59, 999);
    return result;
  }
}
