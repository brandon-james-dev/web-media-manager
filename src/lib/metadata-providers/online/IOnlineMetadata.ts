import type { MetadataResult } from "@/core/contracts";

/**
 * Song lookup result.
 *
 * The shape lives in core (`@/core/contracts`), because a provider is a public
 * extension seam. This alias keeps the provider implementations and their
 * callers reading the name they always have.
 */
export type IOnlineMetadata = MetadataResult;
