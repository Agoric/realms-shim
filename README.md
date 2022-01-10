# Realms Shim : OBSOLETE, INSECURE, NOT RECOMMENDED FOR USE

[![License][license-image]][license-url]

This repository contains a legacy shim implementation of an outdated [Realm API Proposal](https://github.com/tc39/proposal-realms/tree/ff7583930ed67dda603b59e343b3ed85ac741d35#ecmascript-spec-proposal-for-realms-api). 

The Realms proposal has been superceded by the [ShadowRealm Proposal](https://github.com/tc39/proposal-shadowrealm/). This shim does not implement ShadowRealm, which (as of this writing) is a proposal at Stage 3 of the TC39 standardization process, so common JS engines should have support soon.

We do not recommend the use of this shim or the original Realms approach. While the Realm API allows the user to create a new set of independent built-ins (intrinsics), this cannot be used for isolation or security properties without either freezing those intrinsics or hiding them behind a Membrane. The shim provides no mechanism to do either, and both are non-trivial to implement. Without those, when two mutually-suspicious Realms are communicating, both must be extremely careful to prevent any object leakage, otherwise one Realm can pollute the globals or intrinsics of the other.

ShadowRealms defines a "callable boundary" which prevents objects from passing through, mitigating this danger.

In general, we recommend the use of alternate isolation tools like [Endo](https://github.com/endojs/endo/) and the related/embedded SES/HardenedJS environment. This provides `lockdown()` to tame the environment at startup, and the `Compartment` constructor to create evaluation compartments with independent (and potentially frozen) globals. In our experience with the [Agoric SDK](https://github.com/Agoric/agoric-sdk), we find Endo to be much safer and easier to use securely.


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


[license-image]: https://img.shields.io/badge/License-Apache%202.0-blue.svg
[license-url]: LICENSE
