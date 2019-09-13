import test from 'tape';
import Realm from '../../src/realm';

test('set globals', t => {
  const r = Realm.makeRootRealm();

  // strict mode should prevent this
  t.throws(() => r.evaluate('evil = 666'), ReferenceError);

  r.global.victim = 3;
  r.evaluate('victim = 666');
  t.equal(r.global.victim, 666);

  t.end();
});

test('global proxy target/shadow', t => {
  const r = Realm.makeRootRealm();

  // fixed a bug: accessors must have the 'this' value set accordingly.
  Object.defineProperties(r.global, {
    __magic__: {
      get() {
        return this;
      },
      configurable: true
    }
  });

  // The proxy target should not be accessible
  const target = r.evaluate('__magic__');
  t.equal(Object.getPrototypeOf(target), r.global.Object.prototype);
  t.notEqual(Object.getPrototypeOf(target), r.global);

  t.end();
});

test('accessors on globals object', t => {
  const r = Realm.makeRootRealm();

  // fixed a bug: accessors must have the 'this' value set accordingly.
  Object.defineProperties(r.global, {
    foo: {
      get() {
        return this.fooValue;
      },
      set(value) {
        this.fooValue = value;
      }
    },
    fooValue: {
      value: 1,
      writable: true
    }
  });

  // initial value property is on global object/globalThis
  t.equal(r.evaluate(`fooValue`), 1);
  t.equal(r.evaluate(`this.fooValue`), 1);

  // getter's 'this' value correspond to the global object/globalThis
  t.equal(r.evaluate(`foo`), 1);
  t.equal(r.evaluate(`this.foo`), 1);

  // setter's 'this' value correspond to the global object/globalThis
  t.equal(r.evaluate(`foo = 2; this.fooValue`), 2);
  t.equal(r.evaluate(`this.foo = 3; this.fooValue`), 3);

  // final value
  t.equal(r.evaluate(`this.fooValue`), 3);

  t.end();
});
