import { IOBuffer } from 'iobuffer';

import { BLOCK_HEADER_SIZE, MEMBER_ID, TYPE_CODE } from './constants.ts';
import type { SPBlock, SPHistoryRecord } from './types.ts';

/**
 * Read a single block header (ID + size) and return its data as an IOBuffer slice.
 * @param buffer - IOBuffer positioned at the start of a block.
 * @returns The block with its ID and data as an IOBuffer.
 */
export function readBlock(buffer: IOBuffer): SPBlock {
  const id = buffer.readUint16();
  const size = buffer.readInt32();
  const data = new IOBuffer(buffer.readBytes(size));

  return { id, data };
}

/**
 * Read all blocks within a given IOBuffer.
 * @param buffer - IOBuffer containing nested block data.
 * @returns Array of parsed blocks.
 */
export function readNestedBlocks(buffer: IOBuffer): SPBlock[] {
  const blocks: SPBlock[] = [];
  while (buffer.available(BLOCK_HEADER_SIZE)) {
    const id = buffer.readUint16();
    const size = buffer.readInt32();
    if (!buffer.available(size)) break;
    const data = new IOBuffer(buffer.readBytes(size));

    blocks.push({ id, data });
  }
  return blocks;
}

/**
 * Decode a string value from a member block's data.
 * Expects typeCode CHAR (29987): uint16 string length + ASCII bytes.
 * @param data - IOBuffer of the member block data.
 * @returns The decoded string, or empty string if type doesn't match.
 */
export function decodeString(data: IOBuffer): string {
  const typeCode = data.readUint16();
  if (typeCode !== TYPE_CODE.CHAR) return '';
  const length = data.readUint16();
  return data.readUtf8(length);
}

/**
 * Decode a float64 range (min, max) from a member block's data.
 * Expects typeCode COORD_RANGE (29981): 2x float64.
 * @param data - IOBuffer of the member block data.
 * @returns Tuple of [min, max].
 */
export function decodeRange(data: IOBuffer): [number, number] {
  data.skip(2); // type code
  return [data.readFloat64(), data.readFloat64()];
}

/**
 * Decode a single float64 value from a member block's data.
 * Expects typeCode COORD (29979) or DOUBLE (29980).
 * @param data - IOBuffer of the member block data.
 * @returns The decoded float64 value.
 */
export function decodeFloat64(data: IOBuffer): number {
  data.skip(2); // type code
  return data.readFloat64();
}

/**
 * Decode an integer value from a member block's data.
 * Handles LONG (29995), INT (29997), UINT (29996), ULONG (29978), ENUM (29973).
 * @param data - IOBuffer of the member block data.
 * @returns The decoded integer value.
 */
export function decodeInteger(data: IOBuffer): number {
  const typeCode = data.readUint16();
  if (data.available(4)) {
    switch (typeCode) {
      case TYPE_CODE.LONG:
      case TYPE_CODE.INT:
        return data.readInt32();
      case TYPE_CODE.UINT:
      case TYPE_CODE.ULONG:
        return data.readUint32();
      case TYPE_CODE.ENUM:
      case TYPE_CODE.USHORT:
        return data.readUint16();
      default:
        return data.readInt32();
    }
  } else if (data.available(2)) {
    return data.readUint16();
  }
  return 0;
}

/**
 * Decode a float64 array from a member block's data.
 * Expects typeCode COORD_ARRAY (29974): uint32 byte length + float64 values.
 * @param data - IOBuffer of the member block data.
 * @returns Float64Array of decoded values.
 */
export function decodeFloat64Array(data: IOBuffer): Float64Array {
  data.skip(2); // type code
  const byteLength = data.readUint32();
  const count = byteLength / 8;
  const result = new Float64Array(count);
  for (let i = 0; i < count; i++) {
    result[i] = data.readFloat64();
  }
  return result;
}

/**
 * Parse a history record block using the tag-based encoding (#u, $u, etc.).
 * @param data - IOBuffer of the history record data.
 * @returns Parsed history record with text/numeric entries.
 */
export function decodeHistoryRecord(data: IOBuffer): SPHistoryRecord {
  const entries: Array<string | number> = [];

  while (data.available(2)) {
    const tag0 = data.readUint8();
    const tag1 = data.readUint8();

    if (tag1 === 0x75) {
      if (tag0 === 0x23) {
        // #u: string value
        if (!data.available(2)) break;
        const textSize = data.readInt16();
        if (!data.available(textSize)) break;
        entries.push(data.readUtf8(textSize));
      } else if (tag0 === 0x24 || tag0 === 0x2c || tag0 === 0x2d) {
        // $u, ,u, -u: short numeric value
        if (!data.available(2)) break;
        entries.push(data.readInt16());
      } else if (tag0 === 0x2f) {
        // /u: separator/navigation marker
      } else if (tag0 === 0x1a || tag0 === 0x2b) {
        // checksum-like or long value
        if (!data.available(4)) break;
        entries.push(data.readUint32());
      } else if (tag0 === 0x1c) {
        // float64 value
        if (!data.available(8)) break;
        entries.push(data.readFloat64());
      } else if (tag0 === 0x1d) {
        // range: 2x float64
        if (!data.available(16)) break;
        entries.push(data.readFloat64(), data.readFloat64());
      } else if (tag0 === 0x15) {
        // enum value
        if (!data.available(2)) break;
        entries.push(data.readUint16());
      } else if (tag0 === 0x16) {
        // array: uint32 byte length + float64 values
        if (!data.available(4)) break;
        const byteLen = data.readUint32();
        data.skip(byteLen);
      } else {
        data.back();
      }
    } else {
      data.back();
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
