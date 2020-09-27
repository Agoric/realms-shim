// Copyright (C) 2016 the V8 project authors. All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.
/*---
esid: sec-additional-properties-of-the-object.prototype-object
description: Behavior when property exists and is not configurable
info: |
    [...]
    5. Perform ? DefinePropertyOrThrow(O, key, desc).
---*/

import test from 'tape';
import Realm from '../../../../../../../src/realm';

test('test262/annexB/built-ins/Object/prototype/__defineGetter__/define-non-configurable.js', t => {
  t.plan(2);

  const test = () => {
    const noop = function() {};
    const subject = Object.defineProperty({}, 'attr', {
      value: 1,
      configurable: false
    });

    // eslint-disable-next-line no-restricted-properties, no-underscore-dangle
    t.equal(typeof Object.prototype.__defineGetter__, 'function');

    t.throws(() => {
      // eslint-disable-next-line no-restricted-properties, no-underscore-dangle
      subject.__defineGetter__('attr', noop);
    }, TypeError);
  };

  const realm = new Realm();
  realm.globalThis.t = t;
  realm.globalThis.eval(`(${test})()`);
});
