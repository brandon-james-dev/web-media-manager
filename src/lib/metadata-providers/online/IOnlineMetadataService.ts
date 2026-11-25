import type { MetadataService } from "@/core/contracts";

/**
 * Song metadata provider contract.
 *
 * The contract lives in core (`@/core/contracts`), because a provider is a
 * public extension seam. This alias keeps the implementations reading the name
 * they always have.
 */
export type IOnlineMetadataService = MetadataService;
