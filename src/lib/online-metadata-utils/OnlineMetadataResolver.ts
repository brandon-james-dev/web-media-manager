import { ItunesMetadataService } from "../itunes-metadata-utils/ItunesMetadataService";
import { MusicBrainzMetadataService } from "../musicbrainz-metadata-utils/MusicBrainsMetadataService";
import type { IOnlineMetadataService } from "./IOnlineMetadataService";
import { MetadataProvider } from "./MetadataProvider";

export class OnlineMetadataResolver {
  static getService(provider: MetadataProvider): IOnlineMetadataService {
    switch (provider) {
      case MetadataProvider.iTunes:
        return new ItunesMetadataService();
      case MetadataProvider.MusicBrainz:
        return new MusicBrainzMetadataService();
      default:
        throw new Error("Unknown metadata provider");
    }
  }
}
