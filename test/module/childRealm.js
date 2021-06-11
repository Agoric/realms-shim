import test from 'tape';
import sinon from 'sinon';
import { buildCallAndWrapErrorString } from '../../src/callAndWrapError';
import { buildChildRealmString } from '../../src/childRealm';

const unsafeRec = {
  unsafeGlobal: global,
  unsafeEval: eval,
  unsafeFunction: Function
};
unsafeRec.callAndWrapError = unsafeRec.unsafeEval(
  buildCallAndWrapErrorString
)();

const BaseRealm = {
  initRootRealm: () => undefined,
  initCompartment: () => undefined,
  getRealmGlobal: () => undefined,
  realmEvaluate: () => undefined
};

test('buildChildRealm - Realm callAndWrapError() invoked', t => {
  t.plan(3);

  sinon.stub(BaseRealm, 'initRootRealm').callsFake(() => {
    // eslint-disable-next-line no-throw-literal
    throw 'initRootRealm';
  });
  sinon.stub(BaseRealm, 'initCompartment').callsFake(() => {
    // eslint-disable-next-line no-throw-literal
    throw 'initCompartment';
  });

  const Realm = unsafeRec.unsafeEval(buildChildRealmString)(
    unsafeRec,
    BaseRealm
  );

  t.throws(() => new Realm(), /initRootRealm/);
  t.throws(() => Realm.makeRootRealm(), /initRootRealm/);
  t.throws(() => Realm.makeCompartment(), /initCompartment/);

  BaseRealm.initRootRealm.restore();
  BaseRealm.initCompartment.restore();
});

test('buildChildRealm - callAndWrapError() invoked', t => {
  t.plan(2);

  sinon.stub(BaseRealm, 'getRealmGlobal').callsFake(() => {
    // eslint-disable-next-line no-throw-literal
    throw 'getGlobal';
  });
  sinon.stub(BaseRealm, 'realmEvaluate').callsFake(() => {
    // eslint-disable-next-line no-throw-literal
    throw 'evaluate';
  });

  const Realm = unsafeRec.unsafeEval(buildChildRealmString)(
    unsafeRec,
    BaseRealm
  );
  const rootRealm = new Realm();

  t.throws(() => rootRealm.globalThis, /getGlobal/);
  t.throws(() => rootRealm.evaluate(), /evaluate/);

  BaseRealm.getRealmGlobal.restore();
  BaseRealm.realmEvaluate.restore();
});

test('buildChildRealm - callAndWrapError() error types', t => {
  t.plan(8);

  let error;
  sinon.stub(BaseRealm, 'initRootRealm').callsFake(() => {
    throw error;
  });

  const Realm = unsafeRec.unsafeEval(buildChildRealmString)(
    unsafeRec,
    BaseRealm
  );

  t.throws(() => {
    error = '123';
    // eslint-disable-next-line no-new
    new Realm();
  }, /123/);

  t.throws(() => {
    error = '123';
    Realm.makeRootRealm();
  }, /123/);

  [
    EvalError,
    RangeError,
    ReferenceError,
    SyntaxError,
    TypeError,
    URIError
  ].forEach(ErrorConstructor => {
    t.throws(() => {
      error = new ErrorConstructor();
      Realm.makeRootRealm();
    }, ErrorConstructor);
  });

  BaseRealm.initRootRealm.restore();
});

test('buildChildRealm - callAndWrapError() error throws', t => {
  t.plan(2);

  sinon.stub(BaseRealm, 'initRootRealm').callsFake(() => {
    // eslint-disable-next-line no-throw-literal
    throw {
      get name() {
        throw new TypeError();
      }
    };
  });

  const Realm = unsafeRec.unsafeEval(buildChildRealmString)(
    unsafeRec,
    BaseRealm
  );

  t.throws(() => new Realm(), /unknown error/);
  t.throws(() => Realm.makeRootRealm(), /unknown error/);

  BaseRealm.initRootRealm.restore();
});

test('buildChildRealm - callAndWrapError() unknown error type', t => {
  t.plan(2);

  sinon.stub(BaseRealm, 'initRootRealm').callsFake(() => {
    // eslint-disable-next-line no-throw-literal
    throw {
      name: 'foo',
      message: 'bar'
    };
  });

  const Realm = unsafeRec.unsafeEval(buildChildRealmString)(
    unsafeRec,
    BaseRealm
  );

  t.throws(() => new Realm(), Error);
  t.throws(() => Realm.makeRootRealm(), Error);

  BaseRealm.initRootRealm.restore();
});

test('buildChildRealm - toString()', t => {
  t.plan(2);

  const Realm = unsafeRec.unsafeEval(buildChildRealmString)(
    unsafeRec,
    BaseRealm
  );
  const rootRealm = Realm.makeRootRealm();

  t.equals(Realm.toString(), 'function Realm() { [shim code] }');
  t.equals(rootRealm.toString(), '[object Realm]');
});

test('buildChildRealm - new Realm', t => {
  t.plan(5);

  sinon.spy(BaseRealm, 'initRootRealm');

  const Realm = unsafeRec.unsafeEval(buildChildRealmString)(
    unsafeRec,
    BaseRealm
  );
  const options = {};
  // eslint-disable-next-line no-new
  new Realm(options);

  t.equals(BaseRealm.initRootRealm.callCount, 1);

  const args = BaseRealm.initRootRealm.getCall(0).args;
  t.equals(args.length, 3);
  t.equals(args[0], unsafeRec);
  t.ok(args[1] instanceof Realm);
  t.equals(args[2], options);

  BaseRealm.initRootRealm.restore();
});

test('buildChildRealm - Realm.makeRootRealm', t => {
  t.plan(5);

  sinon.spy(BaseRealm, 'initRootRealm');

  const Realm = unsafeRec.unsafeEval(buildChildRealmString)(
    unsafeRec,
    BaseRealm
  );
  const options = {};
  Realm.makeRootRealm(options);

  t.equals(BaseRealm.initRootRealm.callCount, 1);

  const args = BaseRealm.initRootRealm.getCall(0).args;
  t.equals(args.length, 3);
  t.equals(args[0], unsafeRec);
  t.ok(args[1] instanceof Realm);
  t.equals(args[2], options);

  BaseRealm.initRootRealm.restore();
});

test('buildChildRealm - Realm.makeCompartment', t => {
  t.plan(5);

  sinon.spy(BaseRealm, 'initCompartment');

  const Realm = unsafeRec.unsafeEval(buildChildRealmString)(
    unsafeRec,
    BaseRealm
  );
  Realm.makeCompartment();

  t.equals(BaseRealm.initCompartment.callCount, 1);

  const args = BaseRealm.initCompartment.getCall(0).args;
  t.equals(args.length, 3);
  t.equals(args[0], unsafeRec);
  t.ok(args[1] instanceof Realm);
  t.deepEqual(args[2], {});

  BaseRealm.initCompartment.restore();
});

test('buildChildRealm - realm.globalThis', t => {
  t.plan(4);

  const expectedGlobal = {};
  sinon.stub(BaseRealm, 'getRealmGlobal').callsFake(() => expectedGlobal);

  const Realm = unsafeRec.unsafeEval(buildChildRealmString)(
    unsafeRec,
    BaseRealm
  );
  const compartment = Realm.makeCompartment();
  const actualGlobal = compartment.globalThis;

  t.equals(BaseRealm.getRealmGlobal.callCount, 1);

  const args = BaseRealm.getRealmGlobal.getCall(0).args;
  t.equals(args.length, 1);
  t.ok(args[0] instanceof Realm);
  t.equals(actualGlobal, expectedGlobal);

  BaseRealm.getRealmGlobal.restore();
});

test('buildChildRealm - realm.evaluate', t => {
  t.plan(7);

  const expectedResult = 123;
  sinon.stub(BaseRealm, 'realmEvaluate').callsFake(() => expectedResult);

  const source = 'abc';
  const endowments = {};
  const options = {};
  const Realm = unsafeRec.unsafeEval(buildChildRealmString)(
    unsafeRec,
    BaseRealm
  );
  const compartment = Realm.makeCompartment();
  const actualResult = compartment.evaluate(source, endowments);

  t.equals(BaseRealm.realmEvaluate.callCount, 1);

  const args = BaseRealm.realmEvaluate.getCall(0).args;
  t.equals(args.length, 4);
  t.ok(args[0] instanceof Realm);
  t.equals(args[1], source);
  t.equals(args[2], endowments);
  t.deepEqual(args[3], options);

  t.equals(actualResult, expectedResult);

  BaseRealm.realmEvaluate.restore();
});
