import test from 'tape';
import Realm from '../../src/realm';

test('eval-with-endowments', t => {
  const r = new Realm();
  t.equal(r.evaluate(`endow1 + 2`, { endow1: 1 }), 3);

  t.end();
});

test('endowments are not shared between calls to r.evaluate', t => {
  const r = new Realm();
  t.equal(r.evaluate(`4`, { endow1: 1 }), 4);
  t.throws(() => r.evaluate(`endow1`), ReferenceError);
  t.throws(() => r.evaluate(`endow2`), ReferenceError);

  t.end();
});

test('endowments are mutable but not shared between calls to r.evaluate', t => {
  const r = new Realm();

  // assignment to endowments works
  t.equal(r.evaluate(`endow1 = 4; endow1`, { endow1: 1 }), 4);
  t.equal(r.evaluate(`endow1 += 4; endow1`, { endow1: 1 }), 5);

  // the global is not modified when an endowment shadows it
  t.throws(() => r.evaluate(`endow1`), ReferenceError);
  t.equal(r.globalThis.endow1, undefined);

  // assignment to global works even when an endowment shadows it
  t.equal(r.evaluate(`this.endow1 = 4; this.endow1`, { endow1: 1 }), 4);
  t.equal(r.evaluate(`this.endow1 = 4; endow1`, { endow1: 1 }), 1);

  // the modified global is now visible when there is no endowment to shadow it
  t.equal(r.globalThis.endow1, 4);
  t.equal(r.evaluate(`endow1`), 4);

  // endowments shadow globals
  t.equal(r.evaluate(`endow1`, { endow1: 44 }), 44);

  t.end();
});
