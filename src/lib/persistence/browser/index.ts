// Browser-only persistence composition. The CombinedMetadataStore is the
// specific (tentative) browser store that coordinates the Dexie + FileSystem
// backends. Its long-term home depends on the domain-events refactor.
export { CombinedMetadataStore } from "./CombinedMetadataStore";
