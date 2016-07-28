# Exiftool2

[![NPM version][npm-image]][npm-url]
[![NPM downloads][downloads-image]][downloads-url]
[![Build status][travis-image]][travis-url]
[![Test coverage][coveralls-image]][coveralls-url]

> Wrapper for efficiently working with `exiftool`.

## Installation

```sh
npm install exiftool2 --save
```

## Usage

```js
import { exec, open } from 'exiftool2'

// Pass arguments to create an instance of `exiftool` parsing.
// Default arguments: -q -json
// Read more: http://linux.die.net/man/1/exiftool
const exif = exec(['-fast', 'placeholder.png'])

exif.on('exif', ...)
exif.on('error', ...)

// Create an instance that defaults to `-stay_open`.
// Identical to `exec`, except for the default arguments.
// Default arguments: -stay_open True -@ -
const exif = open(['-fast', 'placeholder.png'])

// Push commands to `-execute`. Prepends `-q -json` to each `send()`.
exif.send(['placeholder.png'])

// Pushes `-stay_open False` to be executed, closing `exiftool`.
exif.close()

exif.on('exif', ...)
exif.on('error', ...)
```

## License

Apache 2.0

[npm-image]: https://img.shields.io/npm/v/exiftool2.svg?style=flat
[npm-url]: https://npmjs.org/package/exiftool2
[downloads-image]: https://img.shields.io/npm/dm/exiftool2.svg?style=flat
[downloads-url]: https://npmjs.org/package/exiftool2
[travis-image]: https://img.shields.io/travis/blakeembrey/node-exiftool2.svg?style=flat
[travis-url]: https://travis-ci.org/blakeembrey/node-exiftool2
[coveralls-image]: https://img.shields.io/coveralls/blakeembrey/node-exiftool2.svg?style=flat
[coveralls-url]: https://coveralls.io/r/blakeembrey/node-exiftool2?branch=master
