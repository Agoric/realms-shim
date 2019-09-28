import test from 'tape';
import { repairFunctions } from '../../src/repair/functions';
import Realm from '../../src/realm';

test('repairFunctions', specs => {
  repairFunctions();

  specs.test('Function.prototype.constructor', t => {
    t.plan(7);

    // eslint-disable-next-line no-new-func
    t.doesNotThrow(() => Function(''));

    // eslint-disable-next-line no-proto
    t.doesNotThrow(() => Error.__proto__.constructor(''));
    t.doesNotThrow(() => Function.prototype.constructor(''));

    const proto = Object.getPrototypeOf((0, eval)('(function() {})'));
    t.doesNotThrow(() => proto.constructor(''));

    const realms = Realm.makeCompartment();

    // eslint-disable-next-line no-proto
    t.throws(
      () => realms.evaluate("Error.__proto__.constructor('')"),
      TypeError
    );
    t.throws(
      () => realms.evaluate("Function.prototype.constructor('')"),
      TypeError
    );

    t.throws(
      () =>
        realms.evaluate(`
          const proto = Object.getPrototypeOf((0, eval)('(function() {})'));
          proto.constructor('')`),
      TypeError
    );
  });

  specs.test('AsyncFunction.constructor', t => {
    t.plan(2);

    try {
      const proto = Object.getPrototypeOf((0, eval)('(async function() {})'));
      t.doesNotThrow(() => proto.constructor(''));
    } catch (e) {
      if (
        e instanceof SyntaxError &&
        e.message.startsWith('Unexpected token')
      ) {
        t.pass('not supported');
      } else {
        throw e;
      }
    }

    try {
      const realms = Realm.makeCompartment();
      t.throws(
        () =>
          realms.evaluate(`
            const proto = Object.getPrototypeOf((0, eval)('(async function() {})'));
            proto.constructor('')`),
        TypeError
      );
    } catch (e) {
      if (
        e instanceof SyntaxError &&
        e.message.startsWith('Unexpected token')
      ) {
        t.pass('not supported');
      } else {
        throw e;
      }
    }
  });

  specs.test('GeneratorFunction.constructor', t => {
    t.plan(2);

    try {
      const proto = Object.getPrototypeOf((0, eval)('(function* () {})'));
      t.doesNotThrow(() => proto.constructor(''));
    } catch (e) {
      if (
        e instanceof SyntaxError &&
        e.message.startsWith('Unexpected token')
      ) {
        t.pass('not supported');
      } else {
        throw e;
      }
    }
    try {
      const realm = Realm.makeCompartment();
      t.throws(() =>
        realm.evaluate(
          `
        const proto = Object.getPrototypeOf((0, eval)('(function* () {})'));
        proto.constructor('');`,
          TypeError
        )
      );
    } catch (e) {
      if (
        e instanceof SyntaxError &&
        e.message.startsWith('Unexpected token')
      ) {
        t.pass('not supported');
      } else {
        throw e;
      }
    }
  });

  specs.test('AsyncGeneratorFunction.constructor', t => {
    t.plan(2);

    try {
      const proto = Object.getPrototypeOf((0, eval)('(async function* () {})'));
      t.doesNotThrow(() => proto.constructor(''));
    } catch (e) {
      if (
        e instanceof SyntaxError &&
        e.message.startsWith('Unexpected token')
      ) {
        t.pass('not supported');
      } else {
        throw e;
      }
    }
    try {
      const realm = Realm.makeCompartment();
      t.throws(
        () =>
          realm.evaluate(`
        const proto = Object.getPrototypeOf((0, eval)('(async function* () {})'));
        proto.constructor('');
      `),
        TypeError
      );
    } catch (e) {
      if (
        e instanceof SyntaxError &&
        e.message.startsWith('Unexpected token')
      ) {
        t.pass('not supported');
      } else {
        throw e;
      }
    }
  });
});
