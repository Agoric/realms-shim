// Copyright (C) 2016 the V8 project authors. All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.
/*---
esid: sec-additional-properties-of-the-object.prototype-object
description: Behavior when "this" value defines a like-named data property
info: |
    [...]
    4. Repeat
       a. Let desc be ? O.[[GetOwnProperty]](key).
       b. If desc is not undefined, then
          i. If IsAccessorDescriptor(desc) is true, return desc.[[Get]].
          ii. Return undefined.
       c. Let O be ? O.[[GetPrototypeOf]]().
       d. If O is null, return undefined.
---*/

import test from 'tape';
import Realm from '../../../../../../../src/realm';

test('test262/annexB/built-ins/Object/prototype/__lookupSetter__/lookup-proto-data.js', t => {
  t.plan(1);

  const test = () => {
    const root = Object.defineProperty({}, 'target', { set() {} });
    const desc = { value: null };
    const intermediary = Object.create(root, { target: desc });
    const subject = Object.create(intermediary);

    // eslint-disable-next-line no-restricted-properties, no-underscore-dangle
    t.equal(subject.__lookupSetter__('target'), undefined);
  };

  const realm = new Realm();
  realm.globalThis.t = t;
  realm.globalThis.eval(`(${test})()`);
});
