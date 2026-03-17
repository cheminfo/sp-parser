# sp-parse

[![NPM version](https://img.shields.io/npm/v/sp-parse.svg)](https://www.npmjs.com/package/sp-parse)
[![npm download](https://img.shields.io/npm/dm/sp-parse.svg)](https://www.npmjs.com/package/sp-parse)
[![test coverage](https://img.shields.io/codecov/c/github/cheminfo/sp-parse.svg)](https://codecov.io/gh/cheminfo/sp-parse)
[![license](https://img.shields.io/npm/l/sp-parse.svg)](https://github.com/cheminfo/sp-parse/blob/main/LICENSE)

Parse PerkinElmer SP spectral files.

## Installation

```console
npm install sp-parse
```

## Usage

```js
import { readFileSync } from 'node:fs';

import { parse } from 'sp-parse';

const buffer = readFileSync('path/to/file.sp').buffer;
const result = parse(buffer);

// result.header contains the file signature and description
// result.spectra is an array of spectra, each with:
//   - meta: name, fileType, alias, samplingMethod, dataType, minY, maxY, history
//   - variables: x and y axis data (symbol, label, unitType, data as Float64Array)
```

## License

[MIT](./LICENSE)
