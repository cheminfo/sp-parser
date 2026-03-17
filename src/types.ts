import type { MeasurementVariable } from 'cheminfo-types';
import type { IOBuffer } from 'iobuffer';

export type InputData = ArrayBufferLike | ArrayBufferView | IOBuffer | Buffer;

/**
 * Parsed result from an SP file.
 */
export interface SPResult {
  /** File header information. */
  header: SPHeader;
  /** Parsed spectra from the file. */
  spectra: SPSpectrum[];
}

/**
 * Header of an SP file.
 */
export interface SPHeader {
  /** Magic signature (should be "PEPE"). */
  signature: string;
  /** File description (e.g., "2D constant interval DataSet file"). */
  description: string;
}

/**
 * A single spectrum extracted from an SP file.
 */
export interface SPSpectrum {
  /** Metadata about the spectrum. */
  meta: SPSpectrumMeta;
  /** Spectrum variables (x and y axes). */
  variables: {
    x: SPVariable;
    y: SPVariable;
  };
}

/**
 * Metadata for a single spectrum.
 */
export interface SPSpectrumMeta {
  /** Dataset name or file path. */
  name: string;
  /** File type (e.g., "SPECTRUM"). */
  fileType: string;
  /** Alias name. */
  alias: string;
  /** Sampling method. */
  samplingMethod: string;
  /** Data type code. */
  dataType: number;
  /** Minimum Y value. */
  minY: number;
  /** Maximum Y value. */
  maxY: number;
  /** History records from the dataset. */
  history: SPHistoryRecord[];
}

/**
 * An axis variable (x or y) extending MeasurementVariable with SP-specific unitType.
 */
export interface SPVariable extends MeasurementVariable<Float64Array> {
  /** Unit type code from the SP file. */
  unitType: number;
}

/**
 * A history record entry from a dataset block.
 */
export interface SPHistoryRecord {
  /** Raw text entries parsed from the history record. */
  entries: Array<string | number>;
}

/**
 * A raw block parsed from the SP file.
 */
export interface SPBlock {
  /** Block identifier. */
  id: number;
  /** Block data as an IOBuffer slice. */
  data: IOBuffer;
}
