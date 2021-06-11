import { safeStringifyFunction } from './utilities';

function buildSafeEval(unsafeRec, safeEvalOperation) {
  const { callAndWrapError } = unsafeRec;

  const { defineProperties } = Object;

  // We use the the arrow function syntax to create an eval without
  // a [[Construct]] internal method (such that the invocation "new eval()"
  // throws "TypeError: eval is not a constructor"), since the 'this' binding
  // is ignored. This also prevents rejection by the overly eager
  // rejectDangerousSources.
  const safeEval = x =>
    // https://tc39.es/ecma262/#sec-performeval
    // 2. If Type(x) is not String, return x.
    typeof x !== 'string' ? x : callAndWrapError(safeEvalOperation, [x]);

  // safeEval's prototype RootRealm's value and instanceof Function
  // is true inside the realm. It doesn't point at the primal realm
  // value, and there is no defense against leaking primal realm
  // intrinsics.

  defineProperties(safeEval, {
    // `eval.length` is already initialized correctly.
    // Ensure that `eval.name` is also correct:
    name: { value: 'eval' },
    toString: {
      // We break up the following literal string so that an
      // apparent direct eval syntax does not appear in this
      // file. Thus, we avoid rejection by the overly eager
      // rejectDangerousSources.
      value: () => `function ${'eval'}() { [shim code] }`,
      writable: false,
      enumerable: false,
      configurable: true
    }
  });

  return safeEval;
}
export const buildSafeEvalString = safeStringifyFunction(buildSafeEval);
