import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from 'vitest';

import { parse } from '../index.ts';

test('uv and ir files produce different spectra types', () => {
  const uvData = readFileSync(join(import.meta.dirname, 'data', 'uv.sp'));
  const irData = readFileSync(join(import.meta.dirname, 'data', 'ir.sp'));

  const uvResult = parse(uvData);
  const irResult = parse(irData);

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const uvSpectrum = uvResult.spectra[0]!;
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const irSpectrum = irResult.spectra[0]!;

  // UV uses nm, IR uses cm-1
  expect(uvSpectrum.variables.x.units).toBe('nm');
  expect(irSpectrum.variables.x.units).toBe('cm-1');

  // Different unit types
  expect(uvSpectrum.variables.x.unitType).toBe(11);
  expect(irSpectrum.variables.x.unitType).toBe(10);

  // IR has absorbance unit type 1, UV has unit type 0
  expect(irSpectrum.variables.y.unitType).toBe(1);
  expect(uvSpectrum.variables.y.unitType).toBe(0);

  // Different data lengths
  expect(uvSpectrum.variables.x.data).toHaveLength(81);
  expect(irSpectrum.variables.x.data).toHaveLength(3301);
});

test('invalid file throws error', () => {
  const buffer = new ArrayBuffer(10);
  const view = new Uint8Array(buffer);
  view.set([0x49, 0x4e, 0x56, 0x41]); // "INVA"

  expect(() => parse(buffer)).toThrow('Invalid SP file');
});

test('empty buffer throws error', () => {
  const buffer = new ArrayBuffer(0);

  expect(() => parse(buffer)).toThrow('Invalid SP file');
});

test('buffer too short throws error', () => {
  const buffer = new ArrayBuffer(3);
  const view = new Uint8Array(buffer);
  view.set([0x50, 0x45, 0x50]); // "PEP" (incomplete signature)

  expect(() => parse(buffer)).toThrow('Invalid SP file');
});
