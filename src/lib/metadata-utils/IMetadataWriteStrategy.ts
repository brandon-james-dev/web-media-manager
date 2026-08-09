export interface IMetadataWriteStrategy {
  write(id: string, updated: any): Promise<any>;
}
