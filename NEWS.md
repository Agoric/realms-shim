User-visible changes in realms-shim:

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
