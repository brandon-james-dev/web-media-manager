import type { Song } from "@/models";
import type { IRepository } from "../repository";

export interface IMetadataStore extends IRepository<Song> {}
