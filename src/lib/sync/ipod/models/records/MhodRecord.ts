export type MhodRecord =
  | StringMhodRecord
  | SmartPlaylistDataMhodRecord
  | SmartPlaylistRulesMhodRecord
  | LibraryPlaylistIndexMhodRecord
  | PlaylistColumnMhodRecord
  | UnknownMhodRecord;

interface BaseMhodRecord {
  tag: string;

  headerLength: number;
  totalLength: number;

  type: number;

  unknown1: number;
  unknown2: number;
}

export interface StringMhodRecord extends BaseMhodRecord {
  type: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 12 | 13;

  position: number;
  stringLength: number;

  unknown3: number;
  unknown4: number;

  value: string;
}

export interface LibraryPlaylistIndexMhodRecord extends BaseMhodRecord {
  type: 52;

  fieldId: number;
}

export interface PlaylistColumnMhodRecord extends BaseMhodRecord {
  type: 53;
  fieldId: number;
  value: number;
}

export interface SmartPlaylistRulesMhodRecord extends BaseMhodRecord {
  type: 51;

  rulesId: string;
  unknown5: number;
  numberOfRules: number;
  rulesOperator: number;
}

export interface SmartPlaylistDataMhodRecord extends BaseMhodRecord {
  type: 50;

  liveUpdate: number;
  rulesEnabled: number;
  limitEnabled: number;

  limitType: number;
  limitSort: number;

  limit: number;

  matchCheckedOnly: number;
  reverseLimitSort: number;
}

export interface UnknownMhodRecord extends BaseMhodRecord {
  type: number;
}
