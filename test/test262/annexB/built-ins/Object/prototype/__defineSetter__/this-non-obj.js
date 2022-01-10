// Copyright (C) 2016 the V8 project authors. All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.
/*---
esid: sec-additional-properties-of-the-object.prototype-object
description: Behavior when "this" value is not Object-coercible
info: |
    1. Let O be ? ToObject(this value).
---*/

import test from 'tape';
import Realm from '../../../../../../../src/realm';

test('test262/annexB/built-ins/Object/prototype/__defineSetter__/this-non-obj.js', t => {
  t.plan(4);

  const test = () => {
    // eslint-disable-next-line no-restricted-properties, no-underscore-dangle
    const __defineSetter__ = Object.prototype.__defineSetter__;
    const noop = function() {};
    let toStringCount = 0;
    const key = {
      toString() {
        toStringCount += 1;
      }
    };

    // eslint-disable-next-line no-restricted-properties, no-underscore-dangle
    t.equal(typeof __defineSetter__, 'function');

    t.throws(
      () => {
        __defineSetter__.call(undefined, key, noop);
      },
      TypeError,
      'undefined'
    );

    t.throws(
      () => {
        __defineSetter__.call(null, key, noop);
      },
      TypeError,
      'null'
    );

    t.equal(toStringCount, 0);
  };

  const realm = new Realm();
  realm.globalThis.t = t;
  realm.globalThis.eval(`(${test})()`);
});
