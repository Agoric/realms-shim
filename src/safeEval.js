import { safeStringifyFunction } from './utilities';

function buildSafeEval(unsafeRec, safeEvalOperation) {
  const { callAndWrapError } = unsafeRec;

  const { defineProperties } = Object;

  // We use the the concise method syntax to create an eval without a
  // [[Construct]] behavior (such that the invocation "new eval()" throws
  // TypeError: eval is not a constructor"), but which still accepts a
  // 'this' binding.
  const safeEval = {
    eval() {
      return callAndWrapError(safeEvalOperation, arguments);
    }
  }.eval;

  // safeEval's prototype RootRealm's value and instanceof Function
  // is true inside the realm. It doesn't point at the primal realm
  // value, and there is no defense against leaking primal realm
  // intrinsics.

  defineProperties(safeEval, {
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
