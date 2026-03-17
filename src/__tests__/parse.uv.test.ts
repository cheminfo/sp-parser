import { openAsBlob, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from 'vitest';

import { parse } from '../index.ts';

test('parse uv.sp file from readFileSync', () => {
  const data = readFileSync(join(import.meta.dirname, 'data', 'uv.sp'));
  const result = parse(data);

  expect(result.header.signature).toBe('PEPE');
  expect(result.header.description).toBe('2D constant interval DataSet file');
  expect(result.spectra).toHaveLength(1);

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const spectrum = result.spectra[0]!;

  expect(spectrum.meta.fileType).toBe('SPECTRUM');
  expect(spectrum.meta.dataType).toBe(1);

  const { x, y } = spectrum.variables;

  expect(x.symbol).toBe('x');
  expect(x.label).toBe('nm');
  expect(x.units).toBe('nm');
  expect(x.unitType).toBe(11);
  expect(x.min).toBe(780);
  expect(x.max).toBe(380);
  expect(x.data).toHaveLength(81);
  expect(x.data[0]).toBe(780);
  expect(x.data[80]).toBe(380);

  expect(y.symbol).toBe('y');
  expect(y.label).toBe('nm');
  expect(y.units).toBe('nm');
  expect(y.unitType).toBe(0);
  expect(y.isDependent).toBe(true);
  expect(y.min).toBe(0);
  expect(y.max).toBe(241.68);
  expect(y.data).toHaveLength(81);
  expect(y.data[0]).toBeCloseTo(241.68, 1);
  expect(y.data[80]).toBeCloseTo(9.8, 1);

  expect(x.data).toHaveLength(y.data.length);

  expect(result).toMatchSnapshot();
});

test('parse uv.sp file from blob', async () => {
  const blob = await openAsBlob(join(import.meta.dirname, 'data', 'uv.sp'));
  const result = parse(await blob.arrayBuffer());

  expect(result.header.signature).toBe('PEPE');
  expect(result.spectra).toHaveLength(1);
});

test('parse uv.sp from Uint8Array', () => {
  const data = readFileSync(join(import.meta.dirname, 'data', 'uv.sp'));
  const uint8 = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  const result = parse(uint8);

  expect(result.header.signature).toBe('PEPE');
  expect(result.spectra).toHaveLength(1);
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  expect(result.spectra[0]!.variables.x.data).toHaveLength(81);
});
