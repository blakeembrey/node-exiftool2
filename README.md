# Exiftool2

[![NPM version][npm-image]][npm-url]
[![NPM downloads][downloads-image]][downloads-url]
[![Build status][travis-image]][travis-url]
[![Test coverage][coveralls-image]][coveralls-url]

> Wrapper for efficiently working with `exiftool`.

**I'd also recommend using [exiftool-vendored](https://exiftool-vendored.js.org/)!**

## Installation

```sh
npm install exiftool2 --save
```

## Usage

```js
import { exec, open } from "exiftool2";

// Pass arguments to create an instance of `exiftool` parsing.
// Default arguments: `-q -json`
// Read more: http://linux.die.net/man/1/exiftool
const exif = exec(["-fast", "placeholder.png"]);

// The `exif` result is always an array of exif objects from `exiftool`.
exif.on("exif", data => console.log(data));
exif.on("error", error => console.error(error));

// Supports streaming into `exiftool`.
const exif = exec("-fast", "-");

// Remember you can close the connection early on exif data.
exif.on("exif", data => console.log(data));

// Pipe directly into `exiftool` (E.g. over HTTP).
createReadStream("placeholder.png").pipe(exif);

// Create an instance that defaults to `-stay_open`.
// Identical to `exec`, except for the default arguments.
// Default arguments: `-stay_open True -@ -`
const exif = open(["-fast", "placeholder.png"]);

// Multiple `exif` events will emit in `open` mode.
exif.on("exif", data => console.log(data));

// Push commands to `-execute`. Appends `-q -json` to each `send()` command.
exif.send("placeholder.png");

// You also also stream with `-stay_open`.
// Both `send` and `read` return a promise to resolve with exif data.
exif.read(createReadStream("placeholder.png"));

// Sends `-stay_open False`, causing `exiftool` to close.
exif.close();
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
