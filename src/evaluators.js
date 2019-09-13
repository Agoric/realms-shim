// Portions adapted from V8 - Copyright 2016 the V8 project authors.
// https://github.com/v8/v8/blob/master/src/builtins/builtins-function.cc

import {
  apply,
  arrayJoin,
  arrayPop,
  defineProperties,
  getPrototypeOf,
  regexpTest,
  setPrototypeOf,
  stringIncludes
} from './commons';
import { getOptimizableGlobals } from './optimizer';
import { createScopeHandler } from './scopeHandler';
import { rejectDangerousSourcesTransform } from './sourceParser';
import { assert, throwTantrum } from './utilities';

function buildOptimizer(constants) {
  // No need to build an oprimizer when there are no constants.
  if (constants.length === 0) return '';
  // Use 'this' to avoid going through the scope proxy, which is unecessary
  // since the optimizer only needs references to the safe global.
  return `const {${arrayJoin(constants, ',')}} = this;`;
}

function createScopedEvaluatorFactory(unsafeRec, constants) {
  const { unsafeFunction } = unsafeRec;

  const optimizer = buildOptimizer(constants);

  // Create a function in sloppy mode, so that we can use 'with'. It returns
  // a function in strict mode that evaluates the provided code using direct
  // eval, and thus in strict mode in the same scope. We must be very careful
  // to not create new names in this scope

  // 1: we use 'with' (around a Proxy) to catch all free variable names. The
  // first 'arguments[0]' holds the Proxy which safely wraps the safeGlobal
  // 2: 'optimizer' catches common variable names for speed
  // 3: The inner strict function is effectively passed two parameters:
  //    a) its arguments[0] is the source to be directly evaluated.
  //    b) its 'this' is the this binding seen by the code being
  //       directly evaluated.

  // everything in the 'optimizer' string is looked up in the proxy
  // (including an 'arguments[0]', which points at the Proxy). 'function' is
  // a keyword, not a variable, so it is not looked up. then 'eval' is looked
  // up in the proxy, that's the first time it is looked up after
  // useUnsafeEvaluator is turned on, so the proxy returns the real the
  // unsafeEval, which satisfies the IsDirectEvalTrap predicate, so it uses
  // the direct eval and gets the lexical scope. The second 'arguments[0]' is
  // looked up in the context of the inner function. The *contents* of
  // arguments[0], because we're using direct eval, are looked up in the
  // Proxy, by which point the useUnsafeEvaluator switch has been flipped
  // back to 'false', so any instances of 'eval' in that string will get the
  // safe evaluator.

  return unsafeFunction(`
    with (arguments[0]) {
      ${optimizer}
      return function() {
        'use strict';
        return eval(arguments[0]);
      };
    }
  `);
}

export function createSafeEvaluatorFactory(
  unsafeRec,
  safeGlobal,
  transforms,
  sloppyGlobals
) {
  const { unsafeFunction } = unsafeRec;

  const constants = getOptimizableGlobals(safeGlobal);
  const scopedEvaluatorFactory = createScopedEvaluatorFactory(
    unsafeRec,
    constants
  );

  function factory(endowments = {}, options = {}) {
    const localTransforms = options.transforms || [];
    const realmTransforms = transforms || [];

    const mandatoryTransforms = [rejectDangerousSourcesTransform];
    const allTransforms = [
      ...localTransforms,
      ...realmTransforms,
      ...mandatoryTransforms
    ];

    // todo (shim limitation): scan endowments, throw error if endowment
    // overlaps with the const optimization (which would otherwise
    // incorrectly shadow endowments).
    const scopeHandler = createScopeHandler(
      unsafeRec,
      safeGlobal,
      endowments,
      sloppyGlobals
    );
    const scopeProxy = new Proxy({}, scopeHandler);
    const scopedEvaluator = apply(scopedEvaluatorFactory, safeGlobal, [
      scopeProxy
    ]);

    // We use the the concise method syntax to create an eval without a
    // [[Construct]] behavior (such that the invocation "new eval()" throws
    // TypeError: eval is not a constructor"), but which still accepts a
    // 'this' binding.
    const safeEval = {
      eval(src) {
        src = `${src}`;

        // Rewrite the source, threading through rewriter state as necessary.
        const rewriterState = allTransforms.reduce(
          (rs, transform) => (transform.rewrite ? transform.rewrite(rs) : rs),
          { src, endowments }
        );
        src = rewriterState.src;

        scopeHandler.allowUnsafeEvaluatorOnce();
        let err;
        try {
          // Ensure that "this" resolves to the safe global.
          return apply(scopedEvaluator, safeGlobal, [src]);
        } catch (e) {
          // stash the child-code error in hopes of debugging the internal failure
          err = e;
          throw e;
        } finally {
          // belt and suspenders: the proxy switches this off immediately after
          // the first access, but if that's not the case we abort.
          if (scopeHandler.unsafeEvaluatorAllowed()) {
            throwTantrum('handler did not revoke useUnsafeEvaluator', err);
          }
        }
      }
    }.eval;

    // safeEval's prototype is currently the primal realm's
    // Function.prototype, which we must not let escape. To make 'eval
    // instanceof Function' be true inside the realm, we need to point it at
    // the RootRealm's value.

    // Ensure that eval from any compartment in a root realm is an instance
    // of Function in any compartment of the same root realm.
    setPrototypeOf(safeEval, unsafeFunction.prototype);

    assert(getPrototypeOf(safeEval).constructor !== Function, 'hide Function');
    assert(
      getPrototypeOf(safeEval).constructor !== unsafeFunction,
      'hide unsafeFunction'
    );

    // note: be careful to not leak our primal Function.prototype by setting
    // this to a plain arrow function. Now that we have safeEval, use it.
    defineProperties(safeEval, {
      toString: {
        // We break up the following literal string so that an
        // apparent direct eval syntax does not appear in this
        // file. Thus, we avoid rejection by the overly eager
        // rejectDangerousSources.
        value: safeEval("() => 'function eval' + '() { [shim code] }'"),
        writable: false,
        enumerable: false,
        configurable: true
      }
    });

    return safeEval;
  }

  return factory;
}

export function createSafeEvaluator(safeEvaluatorFactory) {
  return safeEvaluatorFactory();
}

export function createSafeEvaluatorWhichTakesEndowments(safeEvaluatorFactory) {
  return (x, endowments, options = {}) =>
    safeEvaluatorFactory(endowments, options)(x);
}

/**
 * A safe version of the native Function which relies on
 * the safety of evalEvaluator for confinement.
 */
export function createFunctionEvaluator(unsafeRec, safeEval) {
  const { unsafeFunction, unsafeGlobal } = unsafeRec;

  const safeFunction = function Function(...params) {
    const functionBody = `${arrayPop(params) || ''}`;
    let functionParams = `${arrayJoin(params, ',')}`;
    if (!regexpTest(/^[\w\s,]*$/, functionParams)) {
      throw new unsafeGlobal.SyntaxError(
        'shim limitation: Function arg must be simple ASCII identifiers, possibly separated by commas: no default values, pattern matches, or non-ASCII parameter names'
      );
      // this protects against Matt Austin's clever attack:
      // Function("arg=`", "/*body`){});({x: this/**/")
      // which would turn into
      //     (function(arg=`
      //     /*``*/){
      //      /*body`){});({x: this/**/
      //     })
      // which parses as a default argument of `\n/*``*/){\n/*body` , which
      // is a pair of template literals back-to-back (so the first one
      // nominally evaluates to the parser to use on the second one), which
      // can't actually execute (because the first literal evals to a string,
      // which can't be a parser function), but that doesn't matter because
      // the function is bypassed entirely. When that gets evaluated, it
      // defines (but does not invoke) a function, then evaluates a simple
      // {x: this} expression, giving access to the safe global.
    }

    // Is this a real functionBody, or is someone attempting an injection
    // attack? This will throw a SyntaxError if the string is not actually a
    // function body. We coerce the body into a real string above to prevent
    // someone from passing an object with a toString() that returns a safe
    // string the first time, but an evil string the second time.
    // eslint-disable-next-line no-new, new-cap
    new unsafeFunction(functionBody);

    if (stringIncludes(functionParams, ')')) {
      // If the formal parameters string include ) - an illegal
      // character - it may make the combined function expression
      // compile. We avoid this problem by checking for this early on.

      // note: v8 throws just like this does, but chrome accepts
      // e.g. 'a = new Date()'
      throw new unsafeGlobal.SyntaxError(
        'shim limitation: Function arg string contains parenthesis'
      );
      // todo: shim integrity threat if they change SyntaxError
    }

    // todo: check to make sure this .length is safe. markm says safe.
    if (functionParams.length > 0) {
      // If the formal parameters include an unbalanced block comment, the
      // function must be rejected. Since JavaScript does not allow nested
      // comments we can include a trailing block comment to catch this.
      functionParams += '\n/*``*/';
    }

    const src = `(function(${functionParams}){\n${functionBody}\n})`;

    return safeEval(src);
  };

  // Ensure that Function from any compartment in a root realm can be used
  // with instance checks in any compartment of the same root realm.
  setPrototypeOf(safeFunction, unsafeFunction.prototype);

  assert(
    getPrototypeOf(safeFunction).constructor !== Function,
    'hide Function'
  );
  assert(
    getPrototypeOf(safeFunction).constructor !== unsafeFunction,
    'hide unsafeFunction'
  );

  defineProperties(safeFunction, {
    // Ensure that any function created in any compartment in a root realm is an
    // instance of Function in any compartment of the same root ralm.
    prototype: { value: unsafeFunction.prototype },

    // Provide a custom output without overwriting the
    // Function.prototype.toString which is called by some third-party
    // libraries.
    toString: {
      value: safeEval("() => 'function Function() { [shim code] }'"),
      writable: false,
      enumerable: false,
      configurable: true
    }
  });

  return safeFunction;
}
