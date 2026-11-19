import type { ILyricsService, ILyricsServiceConfig } from "./ILyricsService";
import { LyricsProvider } from "./LyricsProvider";
import { LrcLibLyricsService } from "./lrclib/LrcLibLyricsService";

export class LyricsResolver {
  static getService(
    provider: LyricsProvider,
    config: ILyricsServiceConfig = {}
  ): ILyricsService {
    switch (provider) {
      case LyricsProvider.LrcLib:
        return new LrcLibLyricsService(config);
      default:
        throw new Error("Unknown lyrics provider");
    }
  }
}
