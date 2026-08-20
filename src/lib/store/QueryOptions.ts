export type QueryOptions<T> = {
  filter?: (item: T) => boolean;

  sort?: {
    selector: (item: T) => any;
    desc: boolean;
  };

  skip?: number;
  take?: number;
  page?: number;
};
