import type { IOBuffer } from 'iobuffer';

import { BLOCK_HEADER_SIZE, MEMBER_ID, TYPE_CODE } from './constants.ts';
import type { SPBlock, SPHistoryRecord } from './types.ts';

/**
 * Read a single block header (ID + size) from the buffer.
 * @param buffer - IOBuffer positioned at the start of a block.
 * @returns The block with its ID and data view.
 */
export function readBlock(buffer: IOBuffer): SPBlock {
  const id = buffer.readUint16();
  const size = buffer.readInt32();
  const offset = buffer.byteOffset + buffer.offset;
  const data = new DataView(buffer.buffer, offset, size);
  buffer.skip(size);
  return { id, data };
}

/**
 * Read all blocks within a given data range.
 * @param data - DataView containing the block data.
 * @returns Array of parsed blocks.
 */
export function readNestedBlocks(data: DataView): SPBlock[] {
  const blocks: SPBlock[] = [];
  let offset = 0;
  while (offset + BLOCK_HEADER_SIZE <= data.byteLength) {
    const id = data.getUint16(offset, true);
    const size = data.getInt32(offset + 2, true);
    offset += BLOCK_HEADER_SIZE;
    if (offset + size > data.byteLength) break;
    const blockData = new DataView(data.buffer, data.byteOffset + offset, size);
    blocks.push({ id, data: blockData });
    offset += size;
  }
  return blocks;
}

/**
 * Decode a string value from a member block's data.
 * Expects typeCode CHAR (29987): uint16 string length + ASCII bytes.
 * @param data - DataView of the member block data.
 * @returns The decoded string, or empty string if type doesn't match.
 */
export function decodeString(data: DataView): string {
  const typeCode = data.getUint16(0, true);
  if (typeCode !== TYPE_CODE.CHAR) return '';
  const length = data.getUint16(2, true);
  const bytes = new Uint8Array(data.buffer, data.byteOffset + 4, length);
  return new TextDecoder().decode(bytes);
}

/**
 * Decode a float64 range (min, max) from a member block's data.
 * Expects typeCode COORD_RANGE (29981): 2x float64.
 * @param data - DataView of the member block data.
 * @returns Tuple of [min, max].
 */
export function decodeRange(data: DataView): [number, number] {
  return [data.getFloat64(2, true), data.getFloat64(10, true)];
}

/**
 * Decode a single float64 value from a member block's data.
 * Expects typeCode COORD (29979) or DOUBLE (29980).
 * @param data - DataView of the member block data.
 * @returns The decoded float64 value.
 */
export function decodeFloat64(data: DataView): number {
  return data.getFloat64(2, true);
}

/**
 * Decode an integer value from a member block's data.
 * Handles LONG (29995), INT (29997), UINT (29996), ULONG (29978), ENUM (29973).
 * Uses the available data size to determine the actual read width.
 * @param data - DataView of the member block data.
 * @returns The decoded integer value.
 */
export function decodeInteger(data: DataView): number {
  const remaining = data.byteLength - 2;
  if (remaining >= 4) {
    const typeCode = data.getUint16(0, true);
    switch (typeCode) {
      case TYPE_CODE.LONG:
      case TYPE_CODE.INT:
        return data.getInt32(2, true);
      case TYPE_CODE.UINT:
      case TYPE_CODE.ULONG:
        return data.getUint32(2, true);
      case TYPE_CODE.ENUM:
      case TYPE_CODE.USHORT:
        return data.getUint16(2, true);
      default:
        return data.getInt32(2, true);
    }
  } else if (remaining >= 2) {
    return data.getUint16(2, true);
  }
  return 0;
}

/**
 * Decode a float64 array from a member block's data.
 * Expects typeCode COORD_ARRAY (29974): uint32 byte length + float64 values.
 * @param data - DataView of the member block data.
 * @returns Float64Array of decoded values.
 */
export function decodeFloat64Array(data: DataView): Float64Array {
  const byteLength = data.getUint32(2, true);
  const count = byteLength / 8;
  const result = new Float64Array(count);
  for (let i = 0; i < count; i++) {
    result[i] = data.getFloat64(6 + i * 8, true);
  }
  return result;
}

/**
 * Parse a history record block using the tag-based encoding (#u, $u, etc.).
 * @param data - DataView of the history record data.
 * @returns Parsed history record with text/numeric entries.
 */
export function decodeHistoryRecord(data: DataView): SPHistoryRecord {
  const entries: Array<string | number> = [];
  const bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  let offset = 0;

  while (offset + 2 < bytes.length) {
    const tag0 = bytes[offset];
    const tag1 = bytes[offset + 1];

    if (tag1 === 0x75) {
      if (tag0 === 0x23) {
        // #u: string value
        offset += 2;
        if (offset + 2 > bytes.length) break;
        const textSize = data.getInt16(offset, true);
        offset += 2;
        if (offset + textSize > bytes.length) break;
        const text = new TextDecoder().decode(
          bytes.slice(offset, offset + textSize),
        );
        entries.push(text);
        offset += textSize;
      } else if (tag0 === 0x24) {
        // $u: short numeric value
        offset += 2;
        if (offset + 2 > bytes.length) break;
        entries.push(data.getInt16(offset, true));
        offset += 2;
      } else if (tag0 === 0x2c) {
        // ,u: short numeric value
        offset += 2;
        if (offset + 2 > bytes.length) break;
        entries.push(data.getInt16(offset, true));
        offset += 2;
      } else if (tag0 === 0x2d) {
        // -u: numeric value
        offset += 2;
        if (offset + 2 > bytes.length) break;
        entries.push(data.getInt16(offset, true));
        offset += 2;
      } else if (tag0 === 0x2f) {
        // /u: separator/navigation marker
        offset += 2;
      } else if (tag0 === 0x1a) {
        // checksum-like value
        offset += 2;
        if (offset + 4 > bytes.length) break;
        entries.push(data.getUint32(offset, true));
        offset += 4;
      } else if (tag0 === 0x1c) {
        // float64 value
        offset += 2;
        if (offset + 8 > bytes.length) break;
        entries.push(data.getFloat64(offset, true));
        offset += 8;
      } else if (tag0 === 0x1d) {
        // range: 2x float64
        offset += 2;
        if (offset + 16 > bytes.length) break;
        entries.push(
          data.getFloat64(offset, true),
          data.getFloat64(offset + 8, true),
        );
        offset += 16;
      } else if (tag0 === 0x15) {
        // enum value
        offset += 2;
        if (offset + 2 > bytes.length) break;
        entries.push(data.getUint16(offset, true));
        offset += 2;
      } else if (tag0 === 0x16) {
        // array: uint32 byte length + float64 values
        offset += 2;
        if (offset + 4 > bytes.length) break;
        const byteLen = data.getUint32(offset, true);
        offset += 4 + byteLen;
      } else if (tag0 === 0x2b) {
        // long value
        offset += 2;
        if (offset + 4 > bytes.length) break;
        entries.push(data.getUint32(offset, true));
        offset += 4;
      } else {
        offset += 1;
      }
    } else {
      offset += 1;
    }
  }

  return { entries };
}

/**
 * Parse all member blocks in a dataset and extract spectral information.
 * @param blocks - Array of member blocks from a dataset.
 * @returns Extracted dataset fields.
 */
export function parseDatasetMembers(blocks: SPBlock[]): DatasetFields {
  const fields: DatasetFields = {
    name: '',
    fileType: '',
    alias: '',
    samplingMethod: '',
    dataType: 0,
    xAxisLabel: '',
    yAxisLabel: '',
    xAxisUnitType: 0,
    yAxisUnitType: 0,
    minX: 0,
    maxX: 0,
    minY: 0,
    maxY: 0,
    interval: 0,
    numberOfPoints: 0,
    yData: new Float64Array(0),
    history: [],
  };

  for (const block of blocks) {
    switch (block.id) {
      case MEMBER_ID.NAME:
        fields.name = decodeString(block.data);
        break;
      case MEMBER_ID.FILE_TYPE:
        fields.fileType = decodeString(block.data);
        break;
      case MEMBER_ID.ALIAS:
        fields.alias = decodeString(block.data);
        break;
      case MEMBER_ID.SAMPLING_METHOD:
        fields.samplingMethod = decodeString(block.data);
        break;
      case MEMBER_ID.DATA_TYPE:
        fields.dataType = decodeInteger(block.data);
        break;
      case MEMBER_ID.X_AXIS_LABEL:
        fields.xAxisLabel = decodeString(block.data);
        break;
      case MEMBER_ID.Y_AXIS_LABEL:
        fields.yAxisLabel = decodeString(block.data);
        break;
      case MEMBER_ID.X_AXIS_UNIT_TYPE:
        fields.xAxisUnitType = decodeInteger(block.data);
        break;
      case MEMBER_ID.Y_AXIS_UNIT_TYPE:
        fields.yAxisUnitType = decodeInteger(block.data);
        break;
      case MEMBER_ID.ABSCISSA_RANGE: {
        const [min, max] = decodeRange(block.data);
        fields.minX = min;
        fields.maxX = max;
        break;
      }
      case MEMBER_ID.ORDINATE_RANGE: {
        const [min, max] = decodeRange(block.data);
        fields.minY = min;
        fields.maxY = max;
        break;
      }
      case MEMBER_ID.INTERVAL:
        fields.interval = decodeFloat64(block.data);
        break;
      case MEMBER_ID.NUM_POINTS:
        fields.numberOfPoints = decodeInteger(block.data);
        break;
      case MEMBER_ID.DATA:
        fields.yData = decodeFloat64Array(block.data);
        break;
      case MEMBER_ID.HISTORY_RECORD:
        fields.history.push(decodeHistoryRecord(block.data));
        break;
      default:
        // Skip unknown member blocks
        break;
    }
  }

  return fields;
}

export interface DatasetFields {
  name: string;
  fileType: string;
  alias: string;
  samplingMethod: string;
  dataType: number;
  xAxisLabel: string;
  yAxisLabel: string;
  xAxisUnitType: number;
  yAxisUnitType: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  interval: number;
  numberOfPoints: number;
  yData: Float64Array;
  history: SPHistoryRecord[];
}
