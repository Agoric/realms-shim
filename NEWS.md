User-visible changes in realms-shim:

## Release 1.1.1

* Fix published packages: the previous release could not be imported
  successfully becase 'rollup' rewrote `eval` statements in a way that
  conflicted with the shim's use of evaluation. (#40, #54)


## Release 1.1.0

First release to NPM. Previously, code that used realms-shim had to get it as
a git-submodule, or by wholesale cut-and-paste of the code.

* SECURITY UPDATE: This release fixes a sandbox escape discovered in the
  realms-shim by GitHub user "XmiliaH", which works by causing an infinite
  loop and extracting the real function constructor from the RangeError
  exception object. See https://github.com/Agoric/realms-shim/issues/48 for
  more details.
