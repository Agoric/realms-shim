import { cleanupSource } from './utilities';
import { typeObjectAndHasRealmInternalSlot } from './realm';

// buildChildRealm is immediately turned into a string, and this function is
// never referenced again, because it closes over the wrong intrinsics

export function buildChildRealm(unsafeRec, BaseRealm) {
  const {
    initRootRealm,
    initCompartment,
    getRealmGlobal,
    realmEvaluate
  } = BaseRealm;

  // This Object and Reflect are brand new, from a new unsafeRec, so no user
  // code has been run or had a chance to manipulate them. We extract these
  // properties for brevity, not for security. Don't ever run this function
  // *after* user code has had a chance to pollute its environment, or it
  // could be used to gain access to BaseRealm and primal-realm Error
  // objects.
  const { create, defineProperties } = Object;

  const errorConstructors = new Map([
    ['EvalError', EvalError],
    ['RangeError', RangeError],
    ['ReferenceError', ReferenceError],
    ['SyntaxError', SyntaxError],
    ['TypeError', TypeError],
    ['URIError', URIError]
  ]);

  // Like Realm.apply except that it catches anything thrown and rethrows it
  // as an Error from this realm
  function callAndWrapError(target, ...args) {
    try {
      return target(...args);
    } catch (err) {
      if (Object(err) !== err) {
        // err is a primitive value, which is safe to rethrow
        throw err;
      }
      let eName, eMessage, eStack;
      try {
        // The child environment might seek to use 'err' to reach the
        // parent's intrinsics and corrupt them. `${err.name}` will cause
        // string coercion of 'err.name'. If err.name is an object (probably
        // a String of the parent Realm), the coercion uses
        // err.name.toString(), which is under the control of the parent. If
        // err.name were a primitive (e.g. a number), it would use
        // Number.toString(err.name), using the child's version of Number
        // (which the child could modify to capture its argument for later
        // use), however primitives don't have properties like .prototype so
        // they aren't useful for an attack.
        eName = `${err.name}`;
        eMessage = `${err.message}`;
        eStack = `${err.stack || eMessage}`;
        // eName/eMessage/eStack are now child-realm primitive strings, and
        // safe to expose
      } catch (ignored) {
        // if err.name.toString() throws, keep the (parent realm) Error away
        // from the child
        throw new Error('unknown error');
      }
      const ErrorConstructor = errorConstructors.get(eName) || Error;
      try {
        throw new ErrorConstructor(eMessage);
      } catch (err2) {
        err2.stack = eStack; // replace with the captured inner stack
        throw err2;
      }
    }
  }

  // ? Implementing Spec 5.2.1
  class Realm {
    constructor(options) {
      if (new.target === undefined)
        throw new TypeError('NewTarget of Realm must not be undefined');
      // ? 3.a to 3.m
      if (options !== undefined) {
        // ? 3.a
        options = Object(options); // todo: sanitize
        const {
          transform: transformTrap,
          isDirectEval: isDirectEvalTrap,
          intrinsics,
          thisValue
        } = options;
        if (transformTrap === 'inherit') {
          // todo: 3.d.i Set transformTrap to parentRealm.[[TransformTrap]].
        } else if (
          transformTrap !== undefined &&
          typeof transformTrap !== 'function'
        ) {
          // ? 3.e
          throw new TypeError(
            'transform must be a function, "inherit" or undefined'
          );
        }
        if (isDirectEvalTrap === 'inherit') {
          // todo: 3.g.i Set isDirectEvalTrap to parentRealm.[[IsDirectEvalTrap]].
        } else if (
          isDirectEvalTrap !== undefined &&
          typeof isDirectEvalTrap !== 'function'
        ) {
          // ? 3.e
          throw new TypeError(
            'isDirectEval must be a function, "inherit" or undefined'
          );
        }
        if (intrinsics === 'inherit') {
          // todo: 3.j.i Set intrinsics to parentRealm.[[Intrinsics]].
        } else if (intrinsics !== undefined) {
          throw new TypeError('intrinsics must be `inherit` or undefined');
        }
        if (thisValue !== undefined && typeof thisValue !== 'object') {
          throw new TypeError('thisValue must be an object or undefined');
        }
      }

      callAndWrapError(initRootRealm, unsafeRec, this, options);

      if (typeof this.init !== 'function') {
        throw new TypeError('init() must be a function');
      }
      this.init();
    }

    init() {
      typeObjectAndHasRealmInternalSlot(this);
      // todo: 5.4.1.4 Perform ? SetDefaultGlobalBindings(O.[[Realm]]).
    }

    get global() {
      // this is safe against being called with strange 'this' because
      // baseGetGlobal immediately does a trademark check (it fails unless
      // this 'this' is present in a weakmap that is only populated with
      // legitimate Realm instances)
      return callAndWrapError(getRealmGlobal, this);
    }

    get thisValue() {
      typeObjectAndHasRealmInternalSlot(this);
      // todo: 5.4.4.4 Let envRec be O.[[Realm]].[[GlobalEnv]].
      // todo: 5.4.4.5 Return envRec.[[GlobalThisValue]].
      return undefined;
    }

    get stdlib() {
      typeObjectAndHasRealmInternalSlot(this);
      const stdlib = {};
      // todo: 5.4.5.7
      return stdlib;
    }

    get intrinsics() {
      typeObjectAndHasRealmInternalSlot(this);
      const intrinsics = {};
      // todo:5.4.6.6
      return intrinsics;
    }

    // todo: In spec there are no second parameter "endowments"
    // evaluate(sourceText, endowments) {
    evaluate(sourceText) {
      typeObjectAndHasRealmInternalSlot(this);
      if (typeof sourceText !== 'string') {
        throw new TypeError('sourceText must be a string');
      }
      // safe against strange 'this', as above
      // return callAndWrapError(realmEvaluate, this, sourceText, endowments);
      // todo: In spec there are no second parameter "endowments", let's keep it undefined
      return callAndWrapError(realmEvaluate, this, sourceText, undefined);
    }
  }

  defineProperties(Realm, {
    toString: {
      value: () => 'function Realm() { [shim code] }',
      writable: false,
      enumerable: false,
      configurable: true
    }
  });

  defineProperties(Realm.prototype, {
    [Symbol.toStringTag]: {
      value: 'Realm',
      writable: false,
      enumerable: false,
      configurable: true
    }
  });

  return Realm;
}

// The parentheses means we don't bind the 'buildChildRealm' name inside the
// child's namespace. this would accept an anonymous function declaration.
// function expression (not a declaration) so it has a completion value.
const buildChildRealmString = cleanupSource(
  `'use strict'; (${buildChildRealm})`
);

export function createRealmFacade(unsafeRec, BaseRealm) {
  const { unsafeEval } = unsafeRec;

  // The BaseRealm is the Realm class created by
  // the shim. It's only valid for the context where
  // it was parsed.

  // The Realm facade is a lightweight class built in the
  // context a different context, that provide a fully
  // functional Realm class using the intrisics
  // of that context.

  // This process is simplified because all methods
  // and properties on a realm instance already return
  // values using the intrinsics of the realm's context.

  // Invoke the BaseRealm constructor with Realm as the prototype.
  return unsafeEval(buildChildRealmString)(unsafeRec, BaseRealm);
}
