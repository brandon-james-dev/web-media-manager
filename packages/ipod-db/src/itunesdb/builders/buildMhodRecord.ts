import { StringMhodRecord } from "./../../models/records/MhodRecord";
export function buildMhodRecord(
  type: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 12 | 13,
  value: string
): StringMhodRecord {
  return {
    tag: "mhod",

    headerLength: 40,

    totalLength: 40 + value.length * 2,

    type,

    unknown1: 0,
    unknown2: 0,

    position: 1,

    stringLength: value.length,

    unknown3: 0,
    unknown4: 0,

    value,
  };
}
