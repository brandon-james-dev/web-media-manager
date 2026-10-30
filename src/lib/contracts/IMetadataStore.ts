import type { Song } from "@/models";
import type { IRepository } from "../persistence";

export interface IMetadataStore extends IRepository<Song> {}
