export interface DataSourceResult<T> {
  data: T[];

  page?: number;
  skip?: number;

  total: number;
  filteredCount: number;
}
