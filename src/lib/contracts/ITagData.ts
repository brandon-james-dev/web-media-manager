import type { Metadata } from "@/lib/metadata/Metadata";
import type { AUDIO_PROPERTY_KEYS } from "@/lib/metadata/Metadata";

export type ITagData = Omit<Metadata, (typeof AUDIO_PROPERTY_KEYS)[number]>;
