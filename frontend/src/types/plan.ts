export interface PlanDay {
  day: number;
  readings: { bookNumber: number; chapter: number }[];
}

export interface ReadingPlan {
  id: string;
  name: string;
  days: PlanDay[];
}

export interface PlanProgress {
  id: number;
  planId: string;
  bookNumber: number;
  chapter: number;
  completedAt: string;
}
