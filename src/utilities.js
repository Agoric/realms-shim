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
 * cleanupSource()
 * Remove code modifications introduced by ems and nyx in
 * test mode which intefere with Function.toString().
 *
 * Becuase this change is not required at runtime, the
 * body of this function is hollowed-out during the build
 * process by rollup-plugin-strip-code. As configured in
 * in rollup.config.jj, all code between the custom tags
 * START_TESTS_ONLY and END_TESTS_ONLY, and including those
 * tags, is stripped, turning this function into a noop.
 */
export function cleanupSource(src) {
  // Restore eval which is modified by esm module.
  // (0, eval) => (0, _<something>.e)
  src = src.replace(/\(0,\s*_[^.]+\.e\)/g, '(0, eval)');

  // Restore Reflect which is modified by esm module.
  // Reflect => _<something>.e.Reflect
  src = src.replace(/_[^.]+\.g\.Reflect/g, 'Reflect');

  // Remove code coverage which is injected by nyc module.
  src = src.replace(/cov_[^+]+\+\+[;,]/g, '');

  return src;
}
