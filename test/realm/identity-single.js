import test from 'tape';
import Realm from '../../src/realm';

// JSON is an ordinary intrinsic
test('identity JSON', t => {
  t.plan(5);

  const r = Realm.makeRootRealm();

  t.equal(r.evaluate('JSON'), r.evaluate('JSON'));
  t.equal(r.evaluate('JSON'), r.evaluate('(1,eval)("JSON")'));
  t.equal(r.evaluate('JSON'), r.evaluate('(new Function("return JSON"))()'));
  t.equal(r.evaluate('JSON'), r.global.JSON);
  t.notEqual(r.evaluate('JSON'), JSON);
});

// Realm is a facade root-realm-specific
test('identity Realm', t => {
  t.plan(5);

  const r = Realm.makeRootRealm();

  t.ok(r.evaluate('Realm instanceof Function'));
  t.ok(r.evaluate('Realm instanceof Object'));
  t.notOk(r.evaluate('Realm') instanceof Function);
  t.notOk(r.evaluate('Realm') instanceof Object);
  t.notEqual(r.evaluate('Realm'), Realm);
});

// eval is realm-specific
test('identity eval', t => {
  t.plan(3);

  const r = Realm.makeRootRealm();

  t.ok(r.evaluate('eval instanceof Function'));
  t.ok(r.evaluate('eval instanceof Object'));
  t.notEqual(r.evaluate('eval'), eval);
});

// Function is realm-specific
test('identity Function', t => {
  t.plan(5);

  const r = Realm.makeRootRealm();

  t.ok(r.evaluate('Function instanceof Function'));
  t.ok(r.evaluate('Function instanceof Object'));
  t.notOk(r.evaluate('Function') instanceof Function);
  t.notOk(r.evaluate('Function') instanceof Object);

  const f = r.evaluate('function x(a, b) { return a+b; }; x');
  t.ok(f instanceof r.global.Function);
});
