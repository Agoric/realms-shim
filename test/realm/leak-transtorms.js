import test from 'tape';
import Realm from '../../src/realm';

test('transforms - rewriterState', t => {
  let rewriteArguments;

  const r = Realm.makeRootRealm();
  r.evaluate('', undefined, {
    transforms: [
      {
        rewrite(rewriterState) {
          rewriteArguments = arguments;
          // resume
          return rewriterState;
        }
      }
    ]
  });

  // "arguments" use intrinsics from the current realm.
  t.equal(rewriteArguments.length, 1);
  t.ok(rewriteArguments instanceof Object);

  // rewriterState is using intrinsics from the target realm.
  const [rewriteState] = rewriteArguments;
  t.ok(rewriteState instanceof r.global.Object);

  t.end();
});

test('transforms - transforms array', t => {
  let callCount = 0;

  class BadArray extends Array {
    reduce() {
      callCount++;
      // resume
      return Array.prototype.reduce.apply(this, arguments);
    }
  }

  const r = Realm.makeRootRealm();
  const transforms = new BadArray();
  r.evaluate('', undefined, { transforms });

  // Should use the curried form, and remain safe to poisoning.
  t.equal(callCount, 0);

  t.end();
});
