User-visible changes in realms-shim:

## Release 1.2.1 (16-Oct-2019)

SECURITY UPDATE: This release fixes a sandbox escape found by GitHub user
"XmiliaH". All users should update to this version.

* Evaluate all "transform functions" in the target Realm, to avoid leaking
  parent-Realm objects to those functions.
* Use pre-extracted `Array.reduce` instead of the transform list's alleged
  `.reduce` method.
* For more details, see
  https://github.com/Agoric/realms-shim/security/advisories/GHSA-7cg8-pq9v-x98q

Non-security fixes:

* Improve how functions get stringified, so the `esm` module loader will
  cause fewer changes to the source code. (#67)


## Release 1.2.0 (02-Oct-2019)

SECURITY UPDATE: This release fixes multiple sandbox escapes, found by GitHub
users "XmiliaH" and Richard Gibson. All users should update to this version.

* Improve safe/unsafe switch in core evaluator to prevent user-triggered
  exceptions from leaving the evaluator in unsafe mode.
* Catch and wrap all shim exceptions to prevent user code from catching
  primal-realm Error objects.
* Tame `Function` constructor better, to protect against unexpected behavior
  of `Reflect.construct` that could reveal primal-realm objects.
* Unwrap `...args` "spread" operator early, to protect against user code
  modifying `Array.prototype` with `Symbol.iterator` to break confinement.

Non-security fixes:

* Add `getPrototypeOf` trap to the scope handler, needed for Safari. (#62)
* Fix release bundles: rollup was mangling variable names. (#60)


## Release 1.1.2 (25-Sep-2019)

No user-visible changes. Minor dependency updates, including "handlebars"
which npm-audit flagged as a security problem (but which is only used during
tests).


## Release 1.1.1 (24-Sep-2019)

* Fix published packages: the previous release could not be imported
  successfully becase 'rollup' rewrote `eval` statements in a way that
  conflicted with the shim's use of evaluation. (#40, #54)


## Release 1.1.0 (18-Sep-2019)

First release to NPM. Previously, code that used realms-shim had to get it as
a git-submodule, or by wholesale cut-and-paste of the code.

* SECURITY UPDATE: This release fixes a sandbox escape discovered in the
  realms-shim by GitHub user "XmiliaH", which works by causing an infinite
  loop and extracting the real function constructor from the RangeError
  exception object. See https://github.com/Agoric/realms-shim/issues/48 for
  more details.
