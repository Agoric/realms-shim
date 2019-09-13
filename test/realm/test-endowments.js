import test from 'tape';
import Realm from '../../src/realm';

test('eval-with-endowments', t => {
  const r = Realm.makeRootRealm();
  t.equal(r.evaluate(`endow1 + 2`, { endow1: 1 }), 3);

  t.end();
});

test('endowments are not shared between calls to r.evaluate', t => {
  const r = Realm.makeRootRealm();
  t.equal(r.evaluate(`4`, { endow1: 1 }), 4);
  t.throws(() => r.evaluate(`endow1`), ReferenceError);
  t.throws(() => r.evaluate(`endow2`), ReferenceError);

  t.end();
});

test('endowments are mutable but not shared between calls to r.evaluate', t => {
  const r = Realm.makeRootRealm();
  // fixed a bug: the Handlers 'get' finds the property on the target (which
  // has the endowments), the subsequent 'set' modifies it on the safeGlobal
  // (via getPrototypeOf(target)), then the next 'get' pulls the original
  // value from the target again
  // t.equal(r.evaluate(`endow1 = 4; endow1`, { endow1: 1 }), 4);

  // we fixed this by rejecting assignments to endowments
  t.throws(() => r.evaluate(`endow1 = 4`, { endow1: 1 }), TypeError);
  t.throws(() => r.evaluate(`endow1 += 4`, { endow1: 1 }), TypeError);
  t.throws(() => r.evaluate(`endow1`), ReferenceError);

  // assignment to global works even when an endowment shadows it
  t.equal(r.evaluate(`this.endow1 = 4; this.endow1`, { endow1: 1 }), 4);

  // the modified global is now visible when there is no endowment to shadow it
  t.equal(r.evaluate(`endow1`), 4);

  // endowments shadow globals
  t.equal(r.evaluate(`endow1`, { endow1: 44 }), 44);

  t.end();
});

test('accessors on endowments object', t => {
  const r = Realm.makeRootRealm();
  // fixed a bug: accessors must have the 'this' value set accordingly.

  const endowments = Object.create(null, {
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

  // initial value property is on endowments
  t.equal(r.evaluate(`fooValue`, endowments), 1);
  // initial value property is not on the global object/globalThis
  t.equal(r.evaluate(`this.fooValue`, endowments), undefined);

  // getter's 'this' value correspond to the endowments object
  t.equal(r.evaluate(`foo`, endowments), 1);
  // getter is not on the global object/globalThis
  t.equal(r.evaluate(`this.foo`, endowments), undefined);

  // cannot modify an endowment
  t.throws(() => r.evaluate(`foo = 2`, endowments), TypeError);
  // can modify a global even if endowment is present
  t.equal(r.evaluate(`this.foo = 3; this.foo`, endowments), 3);

  // final value
  t.equal(r.evaluate(`fooValue`, endowments), 1);

  t.end();
});
