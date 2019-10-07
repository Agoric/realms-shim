// we'd like to abandon, but we can't, so just scream and break a lot of
// stuff. However, since we aren't really aborting the process, be careful to
// not throw an Error object which could be captured by child-Realm code and
// used to access the (too-powerful) primal-realm Error object.

export function throwTantrum(s, err = undefined) {
  const msg = `please report internal shim error: ${s}`;

  // we want to log these 'should never happen' things.
  // eslint-disable-next-line no-console
  console.error(msg);
  if (err) {
    // eslint-disable-next-line no-console
    console.error(`${err}`);
    // eslint-disable-next-line no-console
    console.error(`${err.stack}`);
  }

  // eslint-disable-next-line no-debugger
  debugger;
  throw msg;
}

export function assert(condition, message) {
  if (!condition) {
    throwTantrum(message);
  }
}

/**
 * safeStringifyFunction()
 * Remove code modifications introduced by ems and nyx in
 * test mode which intefere with Function.toString().
 */
export function safeStringifyFunction(fn) {
  let src = `'use strict'; (${fn})`;

  // esm module creates "runtime" as "_" + hex(3) + "\u200D"

  // Restore eval which is modified by esm module.
  // (0, eval) => (0, <runtime>.e)
  src = src.replace(/\(0,\s*_[0-9a-fA-F]{3}\u200D\.e\)/g, '(0, eval)');

  // Restore globals such as Reflect which are modified by esm module.
  // Reflect => <runtime>.e.Reflect
  src = src.replace(/_[0-9a-fA-F]{3}\u200D\.g\./g, '');

  // Remove code coverage which is injected by nyc module.
  src = src.replace(/cov_[^+]+\+\+[;,]/g, '');

  return src;
}
