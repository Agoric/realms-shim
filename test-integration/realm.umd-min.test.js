import test from 'tape';

const Realm = require('../dist/realms-shim.umd.min.js');

test('new Realm', t => {
  t.plan(3);

  const r = new Realm();

  t.ok(r instanceof Realm);
  t.ok(r.globalThis instanceof r.globalThis.Object);
  t.equal(r.evaluate('42'), 42);
});

test('Realm.makeRootRealm()', t => {
  t.plan(3);

  const r = Realm.makeRootRealm();

  t.ok(r instanceof Realm);
  t.ok(r.globalThis instanceof r.globalThis.Object);
  t.equal(r.evaluate('42'), 42);
});

test('Realm.makeCompartment()', t => {
  t.plan(3);

  const r = Realm.makeCompartment();

  t.ok(r instanceof Realm);
  t.ok(r.globalThis instanceof Object);
  t.equal(r.evaluate('42'), 42);
});
