import tape from 'tape';
import mixedTape from 'mixed-tape';
import Realm from '../../src/realm';

// Runs tests concurrently to better handle OOM
const test = mixedTape(tape);

test('Host exception caused by out-of-memory in eval', t => {
  t.plan(2);

  const r = Realm.makeRootRealm();

  const endowments = { __capture__: {} };

  try {
    r.evaluate(
      `
      function loop(){
        (0, eval)('1');
        loop();
      }

      let err;
      try{
        loop();
      } catch(e) { err = e; }

      __capture__.error = err;
    `,
      endowments
    );
    // eslint-disable-next-line no-empty
  } catch (e) {}

  const {
    __capture__: { error }
  } = endowments;

  t.notOk(error instanceof Error, "should not be parent's Error");
  t.ok(error instanceof r.global.Error, "should be realm's Error");
});

test('Host exception caused by out-of-memory in Function', t => {
  t.plan(2);

  const r = Realm.makeRootRealm();

  const endowments = { __capture__: {} };

  try {
    r.evaluate(
      `
      function loop(){
        Function('1');
        loop();
      }

      let err;
      try{
        loop();
      } catch(e) { err = e; }

      __capture__.error = err;
    `,
      endowments
    );
    // eslint-disable-next-line no-empty
  } catch (e) {}

  const {
    __capture__: { error }
  } = endowments;

  t.notOk(error instanceof Error, "should not be parent's Error");
  t.ok(error instanceof r.global.Error, "should be realm's Error");
});

test('Host exception in eval caused by cannot convert a Symbol value to a string', t => {
  t.plan(2);

  const r = Realm.makeRootRealm();

  const endowments = { __capture__: {} };

  try {
    r.evaluate(
      `
      let err;
      try{
        (0, eval)(Symbol.species);
      } catch(e) { err = e; }

      __capture__.error = err;
    `,
      endowments
    );
    // eslint-disable-next-line no-empty
  } catch (e) {}

  const {
    __capture__: { error }
  } = endowments;

  t.notOk(error instanceof Error, "should not be parent's Error");
  t.ok(error instanceof r.global.Error, "should be realm's Error");
});

test('Host exception in Function caused by cannot convert a Symbol value to a string', t => {
  t.plan(2);

  const r = Realm.makeRootRealm();

  const endowments = { __capture__: {} };

  try {
    r.evaluate(
      `
      let err;
      try{
        Function(Symbol.species);
      } catch(e) { err = e; }

      __capture__.error = err;
    `,
      endowments
    );
    // eslint-disable-next-line no-empty
  } catch (e) {}

  const {
    __capture__: { error }
  } = endowments;

  t.notOk(error instanceof Error, "should not be parent's Error");
  t.ok(error instanceof r.global.Error, "should be realm's Error");
});

test('Host exception caused by redefine property in scope proxy', t => {
  t.plan(2);

  const r = Realm.makeRootRealm();

  const endowments = { __capture__: {} };

  try {
    r.evaluate(
      `
      Object.defineProperty(this, 'abc', { value: 1 });

      let err;
      try{
        abc = 2;
      } catch(e) { err = e; }

      __capture__.error = err;
    `,
      endowments
    );
    // eslint-disable-next-line no-empty
  } catch (e) {}

  const {
    __capture__: { error }
  } = endowments;

  t.notOk(error instanceof Error, "should not be parent's Error");
  t.ok(error instanceof r.global.Error, "should be realm's Error");
});

test('Raised exception rewriter', t => {
  t.plan(2);

  const r = Realm.makeRootRealm();

  const endowments = { __capture__: {} };

  try {
    r.evaluate(
      `
      let err;
      try{
        (0, eval)('--'+'>');
      } catch(e) { err = e; }

      __capture__.error = err;
    `,
      endowments
    );
    // eslint-disable-next-line no-empty
  } catch (e) {}

  const {
    __capture__: { error }
  } = endowments;

  t.notOk(error instanceof Error, "should not be parent's Error");
  t.ok(error instanceof r.global.Error, "should be realm's Error");
});
