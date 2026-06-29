// Job registry — stores and retrieves scheduled job definitions by id
import { type ScheduledJob } from "./job.js";

export interface JobRegistry {
  register(job: ScheduledJob): void;
  unregister(id: string): boolean;
  get(id: string): ScheduledJob | undefined;
  list(): readonly ScheduledJob[];
  clear(): void;
}

class InMemoryJobRegistry implements JobRegistry {
  private readonly jobs = new Map<string, ScheduledJob>();

  register(job: ScheduledJob): void {
    if (this.jobs.has(job.id)) {
      throw new Error(`Job "${job.id}" is already registered`);
    }
    this.jobs.set(job.id, job);
  }

  unregister(id: string): boolean {
    return this.jobs.delete(id);
  }

  get(id: string): ScheduledJob | undefined {
    return this.jobs.get(id);
  }

  list(): readonly ScheduledJob[] {
    return Array.from(this.jobs.values());
  }

  clear(): void {
    this.jobs.clear();
  }
}

/** Creates a new in-memory job registry. */
export function createJobRegistry(): JobRegistry {
  return new InMemoryJobRegistry();
}
