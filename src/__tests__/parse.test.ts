import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from 'vitest';

import { parse } from '../index.ts';

test('parse uv.sp file', () => {
  const buffer = readFileSync(join(import.meta.dirname, 'data', 'uv.sp'));
  const data = new Uint8Array(
    buffer.buffer,
    buffer.byteOffset,
    buffer.byteLength,
  );
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
  expect(x.data).toHaveLength(81);
  expect(x.data[0]).toBe(780);
  expect(x.data[80]).toBe(380);

  expect(y.symbol).toBe('y');
  expect(y.label).toBe('nm');
  expect(y.data).toHaveLength(81);
  expect(y.data[0]).toBeCloseTo(241.68, 1);
  expect(y.data[80]).toBeCloseTo(9.8, 1);

  expect(x.data).toHaveLength(y.data.length);

  expect(result).toMatchSnapshot();
});

test('invalid file throws error', () => {
  const buffer = new ArrayBuffer(10);
  const view = new Uint8Array(buffer);
  view.set([0x49, 0x4e, 0x56, 0x41]); // "INVA"

  expect(() => parse(buffer)).toThrow('Invalid SP file');
});
