import { MAGIC_BALL_CRITERIA_TYPES } from "../../core/Utils/enums";

export interface IMgbProgress {
  myMilestone: number;
  isCompleted: boolean;
}

export interface IMgbTracker {
  getType(): MAGIC_BALL_CRITERIA_TYPES;
  getProgress(userId: string, milestoneValue: number): Promise<IMgbProgress>;
  resetSystem(): Promise<void>;
}

export class MgbTrackerRegistry {
  private static instance: MgbTrackerRegistry | null = null;
  private trackers: Map<MAGIC_BALL_CRITERIA_TYPES, IMgbTracker> = new Map();

  private constructor() {}

  public static getInstance(): MgbTrackerRegistry {
    if (MgbTrackerRegistry.instance === null) {
      MgbTrackerRegistry.instance = new MgbTrackerRegistry();
    }
    return MgbTrackerRegistry.instance;
  }

  public register(tracker: IMgbTracker) {
    this.trackers.set(tracker.getType(), tracker);
  }

  public getTracker(type: MAGIC_BALL_CRITERIA_TYPES): IMgbTracker | undefined {
    return this.trackers.get(type);
  }

  public getAllTrackers(): IMgbTracker[] {
    return Array.from(this.trackers.values());
  }
}
