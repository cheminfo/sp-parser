import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from 'vitest';

import { parse } from '../index.ts';

test('parse ir.sp file (FTIR infrared spectrum)', () => {
  const data = readFileSync(join(import.meta.dirname, 'data', 'ir.sp'));
  const result = parse(data);

  expect(result.header.signature).toBe('PEPE');
  expect(result.header.description).toBe('2D constant interval DataSet file');
  expect(result.spectra).toHaveLength(1);

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const spectrum = result.spectra[0]!;

  expect(spectrum.meta.fileType).toBe('Spectrum');
  expect(spectrum.meta.alias).toBe('strip01');
  expect(spectrum.meta.dataType).toBe(16);
  expect(spectrum.meta.minY).toBeCloseTo(-0.0442, 3);
  expect(spectrum.meta.maxY).toBeCloseTo(0.3591, 3);

  const { x, y } = spectrum.variables;

  expect(x.symbol).toBe('x');
  expect(x.label).toBe('cm-1');
  expect(x.unitType).toBe(10);
  expect(x.data).toHaveLength(3301);
  expect(x.data[0]).toBe(4000);
  expect(x.data[3300]).toBe(700);

  expect(y.symbol).toBe('y');
  expect(y.label).toBe('A');
  expect(y.unitType).toBe(1);
  expect(y.data).toHaveLength(3301);
  expect(y.data[0]).toBeCloseTo(0.0372, 3);
  expect(y.data[3300]).toBeCloseTo(0.0042, 3);

  expect(spectrum.meta.history).toHaveLength(1);
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  expect(spectrum.meta.history[0]!.entries).toHaveLength(86);

  expect(result).toMatchSnapshot();
});

test('parse ir.sp as ArrayBuffer', () => {
  const data = readFileSync(join(import.meta.dirname, 'data', 'ir.sp'));
  const result = parse(data.buffer);

  expect(result.header.signature).toBe('PEPE');
  expect(result.spectra).toHaveLength(1);

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const spectrum = result.spectra[0]!;

  expect(spectrum.variables.x.label).toBe('cm-1');
  expect(spectrum.variables.y.label).toBe('A');
});

test('ir.sp x-axis is evenly spaced (constant interval)', () => {
  const data = readFileSync(join(import.meta.dirname, 'data', 'ir.sp'));
  const result = parse(data);

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const xData = result.spectra[0]!.variables.x.data;
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const step = xData[1]! - xData[0]!;

  for (let i = 2; i < xData.length; i++) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(xData[i]! - xData[i - 1]!).toBeCloseTo(step, 10);
  }
});
