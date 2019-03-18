# Realm Shim
[![Build Status][travis-svg]][travis-url]
[![Coverage Status][coveralls-svg]][coveralls-url]
[![dependency status][deps-svg]][deps-url]
[![dev dependency status][dev-deps-svg]][dev-deps-url]
[![License][license-image]][license-url]


This folder contains a shim implementation of the [Realm API Proposal](https://github.com/tc39/proposal-realms/#ecmascript-spec-proposal-for-realms-api). 

## Limitations

The current implementation has 3 main limitations:

* All code evaluated inside a Realm runs in strict mode.
* Direct eval is not supported.
* `let`, global function declarations and any other feature that relies on new bindings in global contour are not preserved between difference invocations of eval, instead we create a new contour everytime.

## Building the Shim

```bash
git clone https://github.com/Agoric/realms-shim.git
cd realms-shim
npm install
npm run shim:build
```

This will install the necessary dependencies and build the shim locally.

## Playground

To open the playground example in your default browser:

```bash
npm run shim:build
open examples/simple.html
```

## Usage

To use the shim in a webpage, build the shim, then:

```html
  <script src="../dist/realm-shim.min.js"></script>
  <script>
    const r = new Realm();
    [...]
  </script>
```

To use the shim with node:
```js
  const Realm = require('./realm-shim.min.js');
  const r = new Realm();
  [...]
```

You can also use the ES6 module version of the Realms shim in Node.js via the package `esm`. To do that, launch node with esm via the "require" option:

```bash
npm install esm
node -r esm main.js
```

And import the realm module in your code:

```js
  import Realm from './src/realm';
  const r = new Realm();
  [...]
```

## Examples

### Example 1: Root Realm

To create a root realm with a new global and a fresh set of intrinsics:

```js
const r = new Realm(); // root realm
r.global === this; // false
r.global.JSON === JSON; // false
```

### Example 2: Realm Compartment

To create a realm compartment with a new global and inherit the intrinsics from another realm:

```js
const r1 = new Realm(); // root realm
const r2 = new r1.global.Realm({ intrinsics: 'inherit' }); // realm compartment
r1.global === r2.global; // false
r1.global.JSON === r2.global.JSON; // true
```

### Example 3: Realm Compartment from current Realm

To create a realm compartment with a new global and inherit the intrinsics from the current execution context:

```js
const r = new Realm({ intrinsics: 'inherit' }); // realm compartment
r.global === this; // false
r.global.JSON === JSON; // true
```

[travis-svg]: https://travis-ci.com/Agoric/realms-shim.svg?branch=master
[travis-url]: https://travis-ci.com/Agoric/realms-shim
[coveralls-svg]: https://coveralls.io/repos/github/Agoric/realms-shim/badge.svg
[coveralls-url]: https://coveralls.io/github/Agoric/realms-shim
[deps-svg]: https://david-dm.org/Agoric/realms-shim.svg
[deps-url]: https://david-dm.org/Agoric/realms-shim
[dev-deps-svg]: https://david-dm.org/Agoric/realms-shim/dev-status.svg
[dev-deps-url]: https://david-dm.org/Agoric/realms-shim?type=dev
[license-image]: https://img.shields.io/badge/License-Apache%202.0-blue.svg
[license-url]: LICENSE
