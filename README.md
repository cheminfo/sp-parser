# @cheminfo/sp-parser

[![NPM version](https://img.shields.io/npm/v/@cheminfo/sp-parser.svg)](https://www.npmjs.com/package/@cheminfo/sp-parser)
[![npm download](https://img.shields.io/npm/dm/@cheminfo/sp-parser.svg)](https://www.npmjs.com/package/@cheminfo/sp-parser)
[![test coverage](https://img.shields.io/codecov/c/github/cheminfo/sp-parser.svg)](https://codecov.io/gh/cheminfo/sp-parser)
[![license](https://img.shields.io/npm/l/@cheminfo/sp-parser.svg)](https://github.com/cheminfo/sp-parser/blob/main/LICENSE)

Parse PerkinElmer SP spectral files.

## Installation

```console
npm install @cheminfo/sp-parser
```

## Usage

```js
import { readFileSync } from 'node:fs';

import { parse } from '@cheminfo/sp-parser';

const buffer = readFileSync('path/to/file.sp').buffer;
const result = parse(buffer);

// result.header contains the file signature and description
// result.spectra is an array of spectra, each with:
//   - meta: name, fileType, alias, samplingMethod, dataType, minY, maxY, history
//   - variables: x and y axis data (symbol, label, unitType, data as Float64Array)
```

## License

[MIT](./LICENSE)
