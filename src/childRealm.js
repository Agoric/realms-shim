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

  const { create, defineProperties } = Object;

  class Realm {
    constructor() {
      // The Realm constructor is not intended to be used with the new operator
      // or to be subclassed. It may be used as the value of an extends clause
      // of a class definition but a super call to the Realm constructor will
      // cause an exception.

      // When Realm is called as a function, an exception is also raised because
      // a class constructor cannot be invoked without 'new'.
      throw new TypeError('Realm is not a constructor');
    }

    static makeRootRealm(options = {}) {
      // This is the exposed interface.

      // Bypass the constructor.
      const r = create(Realm.prototype);
      callAndWrapError(initRootRealm, [unsafeRec, r, options]);
      return r;
    }

    static makeCompartment(options = {}) {
      // Bypass the constructor.
      const r = create(Realm.prototype);
      callAndWrapError(initCompartment, [unsafeRec, r, options]);
      return r;
    }

    // we omit the constructor because it is empty. All the personalization
    // takes place in one of the two static methods,
    // makeRootRealm/makeCompartment

    get global() {
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
    toString: {
      value: () => '[object Realm]',
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
