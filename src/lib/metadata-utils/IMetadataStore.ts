import type { Song } from "@/models";
import type { IRepository } from "../store";

export interface IMetadataStore extends IRepository<Song> {}
