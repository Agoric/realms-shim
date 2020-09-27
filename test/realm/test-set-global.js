import test from 'tape';
import Realm from '../../src/realm';

test('set globals', t => {
  const r = new Realm();

  // strict mode should prevent this
  t.throws(() => r.evaluate('evil = 666'), ReferenceError);

  r.globalThis.victim = 3;
  r.evaluate('victim = 666');
  t.equal(r.globalThis.victim, 666);

  t.end();
});
