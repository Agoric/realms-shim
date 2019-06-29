import test from 'tape';
import Realm from '../../src/realm';

test('new Realm', t => {
  t.plan(1);

  t.doesNotThrow(() => new Realm(), 'new Realm() should not throws');
});
