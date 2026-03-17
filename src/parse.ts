import { IOBuffer } from 'iobuffer';

import { BLOCK_ID, DESCRIPTION_LENGTH, SP_MAGIC } from './constants.ts';
import {
  parseDatasetMembers,
  readBlock,
  readNestedBlocks,
} from './parseBlocks.ts';
import type { InputData, SPHeader, SPResult, SPSpectrum } from './types.ts';

/**
 * Parse a PerkinElmer SP file.
 * @param buffer - SP file data as an ArrayBuffer, typed array, IOBuffer, or Buffer.
 * @returns Parsed result containing header and spectra.
 */
export function parse(buffer: InputData): SPResult {
  const ioBuffer = new IOBuffer(buffer);

  const header = parseHeader(ioBuffer);
  const spectra: SPSpectrum[] = [];

  while (ioBuffer.offset < ioBuffer.length) {
    const block = readBlock(ioBuffer);

    if (block.id === BLOCK_ID.DATASET) {
      const memberBlocks = readNestedBlocks(block.data);
      const fields = parseDatasetMembers(memberBlocks);

      const xData = generateXValues(
        fields.minX,
        fields.maxX,
        fields.numberOfPoints,
      );

      spectra.push({
        meta: {
          name: fields.name,
          fileType: fields.fileType,
          alias: fields.alias,
          samplingMethod: fields.samplingMethod,
          dataType: fields.dataType,
          minY: fields.minY,
          maxY: fields.maxY,
          history: fields.history,
        },
        variables: {
          x: {
            symbol: 'x',
            label: fields.xAxisLabel,
            unitType: fields.xAxisUnitType,
            data: xData,
          },
          y: {
            symbol: 'y',
            label: fields.yAxisLabel,
            unitType: fields.yAxisUnitType,
            data: fields.yData,
          },
        },
      });
    }
    // Skip non-dataset top-level blocks (instrument headers, history, etc.)
  }

  return { header, spectra };
}

/**
 * Parse the SP file header (PEPE signature + description).
 * @param buffer - IOBuffer positioned at the start of the file.
 * @returns Parsed header.
 */
function parseHeader(buffer: IOBuffer): SPHeader {
  const signature = buffer.readUtf8(4);

  if (signature !== SP_MAGIC) {
    throw new Error(
      `Invalid SP file: expected "${SP_MAGIC}" signature, got "${signature}"`,
    );
  }

  const description = buffer.readUtf8(DESCRIPTION_LENGTH).replace(/\0+$/, '');

  return { signature, description };
}

/**
 * Generate evenly spaced X values using linspace.
 * @param start - Start value of the range.
 * @param end - End value of the range.
 * @param numberOfPoints - Number of points to generate.
 * @returns Float64Array of evenly spaced values.
 */
function generateXValues(
  start: number,
  end: number,
  numberOfPoints: number,
): Float64Array {
  const xData = new Float64Array(numberOfPoints);
  if (numberOfPoints <= 1) {
    xData[0] = start;
    return xData;
  }
  const step = (end - start) / (numberOfPoints - 1);
  for (let i = 0; i < numberOfPoints; i++) {
    xData[i] = start + i * step;
  }
  return xData;
}
