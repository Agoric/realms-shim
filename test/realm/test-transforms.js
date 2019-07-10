import test from 'tape';
import Realm from '../../src/realm';

test('init transforms', t => {
  try {
    for (const isRoot of [true, false]) {
      const transforms = [
        {
          init(r) {
            r.global.MyGlobal = r.evaluate(`(nick) => 'goodbye ' + nick`);
            r.myFirstSymbol = 'foo';
          }
        },
        {
          init(r) {
            r.mySymbol = 'hello';
          }
        },
        {
          init(r) {
            r.global.MyGlobal = r.evaluate(`(nick) => 'hello ' + nick`);
          }
        }
      ];
      const r = isRoot
        ? Realm.makeRootRealm({ transforms })
        : Realm.makeCompartment({ transforms });
      t.equal(r.evaluate(`MyGlobal('person')`), 'hello person');
      t.equal(r.mySymbol, 'hello');
      t.equal(r.myFirstSymbol, 'foo');
    }
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});
