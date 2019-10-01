import test from 'tape';
const Realm = require('../dist/realms-shim.umd.min.js');

test('new Realm', t => {
  t.plan(1);

  t.throws(() => new Realm(), TypeError, 'new Real() should throws');
});

test('Realm.makeRootRealm()', t => {
  t.plan(3);

  const r = Realm.makeRootRealm();

  t.ok(r instanceof Realm);
  t.ok(r.global instanceof r.global.Object);
  t.equal(r.evaluate('42'), 42);
});

test('Realm.makeCompartment()', t => {
  t.plan(3);

  const r = Realm.makeCompartment();

  t.ok(r instanceof Realm);
  t.ok(r.global instanceof Object);
  t.equal(r.evaluate('42'), 42);
});
