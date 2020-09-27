import { safeStringifyFunction } from './utilities';

// buildChildRealm is immediately turned into a string, and this function is
// never referenced again, because it closes over the wrong intrinsics

export function buildChildRealm(unsafeRec, BaseRealm) {
  const { callAndWrapError } = unsafeRec;
  const {
    initRootRealm,
    initCompartment,
    getRealmGlobal,
    realmEvaluate
  } = BaseRealm;

  const { create, defineProperties, getOwnPropertyDescriptor } = Object;

  class Realm {
    constructor(options = {}) {
      // The Realm constructor creates and initializes a new Realm object
      // when called as a constructor.

      // When Realm is called as a function, an exception is raised because
      // a class constructor cannot be invoked without 'new'.
      callAndWrapError(initRootRealm, [unsafeRec, this, options]);
    }

    /** @deprecated Use `new Realm()` */
    static makeRootRealm(options = {}) {
      return new Realm(options);
    }

    /**
     * @deprecated Will be replaced by the `Compartment` constructor.
     * @see https://github.com/tc39/proposal-compartments
     */
    static makeCompartment(options = {}) {
      // Bypass the constructor.
      const r = create(Realm.prototype);
      callAndWrapError(initCompartment, [unsafeRec, r, options]);
      return r;
    }

    get globalThis() {
      // this is safe against being called with strange 'this' because
      // baseGetGlobal immediately does a trademark check (it fails unless
      // this 'this' is present in a weakmap that is only populated with
      // legitimate Realm instances)
      return callAndWrapError(getRealmGlobal, [this]);
    }

    evaluate(x, endowments, options = {}) {
      // safe against strange 'this', as above
      return callAndWrapError(realmEvaluate, [this, x, endowments, options]);
    }

    // TODO: Implement `Realm.prototype.import(...)`
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
    /** @deprecated Use `realm.globalThis` */
    global: getOwnPropertyDescriptor(Realm.prototype, 'globalThis'),
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
export const buildChildRealmString = safeStringifyFunction(buildChildRealm);
