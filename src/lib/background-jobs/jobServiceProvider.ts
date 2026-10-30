import { setJobServiceProvider, type IJobService } from "@/core/jobs";
import { backgroundService } from "./BackgroundService";

/**
 * Browser job-service binding.
 *
 * Binds the core's job-service port to the browser BackgroundService (which
 * runs jobs over the web Worker pool). Wired in during bootstrap so the UI
 * can enqueue and observe background jobs through the portable port.
 */
export function registerBrowserJobService(): void {
  setJobServiceProvider(() => backgroundService as IJobService);
}
