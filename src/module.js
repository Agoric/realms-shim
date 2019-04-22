/* global mu lo */
const harden = Object.freeze;  // TODO fix

// TODO get from './common'
const {
  getOwnPropertyDescriptors: getProps,
  defineProperty: defProp,
  create,
  entries
} = Object;


// See https://tc39.github.io/ecma262/#importentry-record for
// terminology and examples.
// "tdz" is "temporal dead zone"

// ModuleRecord: {
//   // Accurately verify has no "h$_stuff" variable names.
//   moduleSource: original string,
//   // rest are generated from moduleSource
//   imports: { _specifierName_: { _importName_: [localName*] }},
//   liveExports: { _liveExportName_: [localName?] },
//   fixedExports: { _fixedExportName_: [localName?] },
//   functorSource: rewritten string
//   optSourceMap: from moduleSource to functorSource
// }

const barModuleRecord = harden({
  moduleSource: `\
// Adapted from table 43
import v from 'mod1';
import * as ns from 'mod1';
import {x} from 'mod2';
import {x as w} from 'mod2';
import 'mod3';

export let mu = 88;
mu = mu + 1;  // live because assigned to
let lo = 22;
lo = lo + 1;  // live because assigned to
export {lo as ex};

// Adapted from table 45
export let co == 77;
export default 42;
const xx = 33;
export {xx};

export {w as vv};  // exports the w we imported. Therefore assumed live.
export {f} from 'foo';
export {g as h} from 'foo';
// export * from 'foo';
`,

  // { _specifierName_: { _importName_: [localName*] }}
  // Record of imported module specifier names to record of importName
  // to list of localNames.
  // The importName "*" is that module's module namespace object.
  //
  // TODO: These localNames are not used. Should we revert to
  // [importName*] ?
  imports: {
    mod1: { default: ['v'], '*': ['ns'] },
    mod2: { x: ['x', 'w'] },
    mod3: {},
    foo: { f: [], g: [] }
  },

  // { _liveExportName_: [localName?] }
  // exportNames of variables that are assigned to, or reexported and
  // therefore assumed live. A reexported variable might not have any
  // localName.
  //
  // It is strange that we say "vv: []" rather than "vv: ['w']" since
  // 'w' is the local name we're exporting as vv. However, it
  // translates to a declared local name, whereas the localNames of
  // liveExports are used to set up proxy trapping, which doesn't
  // apply to reexported names.
  liveExports: { mu: ['mu'], ex: ['lo'], vv: [], f: [], h: [] },

  // { _fixedExportName_: [localName?] }
  // exportNames of variables that are only initialized. The
  // exportName 'default' has no localName.
  //
  // TODO: These localNames are not used. Should we revert to
  // [fixedExportName*] ?
  fixedExports: { co: ['co'], default: [], xx: ['xx'] },

  functorSource: `(${
    function($h_import, $h_once, $h_live) {

      // import section
      let v, ns, x, w;
      $h_import({
        mod1: {
          default: [$h_a => {v = $h_a;}],
          '*': [$h_a => {ns = $h_a;}]
        },
        mod2: {
          x: [$h_live.vv, $h_a => {x = $h_a;}, $h_a => {w = $h_a;}]
        },
        mod3: {},
        foo: {
          f: [$h_live.f],
          g: [$h_live.h]
        }
      });

      // rewritten body
      $h_live.mu(88);
      mu = mu + 1;  // mu is free so that access will proxy-trap
      $h_live.ex(22);
      lo = lo + 1;  // lo is free so that access will proxy-trap

      const co = $h_once.co(77);
      $h_once.default(42);
      const xx = $h_once.xx(33);
    }
  })`
});

//---------

function makeModule(moduleRecord, registry, evaluator, preEndowments) {
  // {exportName: getter} module namespace object
  const moduleNS = create(null);

  // {localName: accessor} added to endowments for proxy traps
  const trappers = create(null);

  // {fixedExportName: init(initValue) -> initValue} used by the
  // rewritten code to initialize exported fixed bindings.
  const hOnce = create(null);

  // {liveExportName: update(newValue)} used by the rewritten code to
  // both initiailize and update live bindings.
  const hLive = create(null);

  // {importName: notify(update(newValue))} Used by code that imports
  // one of this module's exports, so that their update function will
  // be notified when this binding is initialized or updated.
  const notifiers = create(null);


  for (const [fixedExportName, _] of entries(moduleRecord.fixedExports)) {
    const qname = JSON.stringify(fixedExportName);

    // fixed binding state
    let value = undefined;
    let tdz = true;
    let optUpdaters = [];  // optUpdaters === null iff tdz === false

    // tdz sensitive getter
    function get() {
      if (tdz) {
        throw new ReferenceError(`binding ${qname} not yet initialized`);
      }
      return value;
    }

    // leave tdz once
    function init(initValue) {
      // init with initValue of a declared const binding, and return
      // it.
      if (!tdz) {
        throw new Error(`Internal: binding ${qname} already initialized`);
      }
      value = initValue;
      const updaters = optUpdaters;
      optUpdaters = null;
      tdz = false;
      for (const update of updaters) { update(initValue); }
      return initValue;
    }

    // If still tdz, register update for notification later.
    // Otherwise, update now.
    function notify(update) {
      if (tdz) {
        optUpdaters.push(update);
      } else {
        update(value);
      }
    }

    defProp(moduleNS, fixedExportName, {
      get,
      set: undefined,
      enumerable: true,
      configurable: false
    });
    
    hOnce[fixedExportName] = init;
    notifiers[fixedExportName] = notify;
  }

  for (const [liveExportName, vars] of entries(moduleRecord.liveExports)) {
    const qname = JSON.stringify(liveExportName);

    // live binding state
    let value = undefined;
    let tdz = true;
    const updaters = [];

    // tdz sensitive getter
    function get() {
      if (tdz) {
        throw new ReferenceError(`binding ${qname} not yet initialized`);
      }
      return value;
    }

    // This must be usable locally for the translation of initializing
    // a declared local live binding variable.
    //
    // For reexported variable, this is also an update function to
    // register for notification with the downstream import, which we
    // must assume to be live. Thus, it can be called independent of
    // tdz but always leaves tdz. Such reexporting creates a tree of
    // bindings. This lets the tree be hooked up even if the imported
    // module isn't initialized yet, as may happen in cycles.
    function update(newValue) {
      value = newValue;
      tdz = false;
      for (const update of updaters) { update(newValue); }
    }

    // tdz sensitive setter
    function set(newValue) {
      if (tdz) {
        throw new ReferenceError(`binding ${qname} not yet initialized`);
      }
      value = newValue;
      for (const update of updaters) { update(newValue); }
    }

    // Always register the update function.
    // If not in tdz, also update now.
    function notify(update) {
      updaters.push(update);
      if (!tdz) {
        update(value);
      }
    }

    defProp(moduleNS, liveExportName, {
      get,
      set: undefined,
      enumerable: true,
      configurable: false
    });

    for (const localName of vars) {
      defProp(trappers, localName, {
        get,
        set,
        enumerable: true,
        configurable: false
      });
    }

    hLive[liveExportName] = update;
    notifiers[liveExportName] = notify;
  }

  function notifyStar(update) {
    update(moduleNS);
  }
  notifiers['*'] = notifyStar;

  // The updateRecord must conform to moduleRecord.imports
  // updateRecord = { _specifier_: importUpdaters }
  // importUpdaters = { _importName_: [update(newValue)*] }}
  function hImport(updateRecord) {
    // By the time hImport is called, the registry should already be
    // initialized with modules that satisfy moduleRecord.imports
    // registry = { _specifier_: { initialize, notifiers }}
    // notifiers = { _importName_: notify(update(newValue))}
    for (const [specifier, importUpdaters] of entries(updateRecord)) {
      const module = registry[specifier];
      module.initialize();  // bottom up cycle tolerant
      const notifiers = module.notifiers;
      for (const [importName, updaters] of entries(importUpdaters)) {
        const notify = notifiers[importName];
        for (const update of updaters) {
          notify(update);
        }
      }
    }
  }

  const endowments = create(null, {
    // TODO should check for collisions.
    // TODO should check that preEndowments has no $h_stuff names.
    // Neither is a security hole since trappers replace conflicting
    // preEndowments
    ...getProps(preEndowments), ...getProps(trappers)
  });
  
  let optFunctor = evaluator(moduleRecord.functorSource, endowments);
  function initialize() {
    if (optFunctor) {
      // uninitialized
      const functor = optFunctor;
      optFunctor = null;
      // initializing
      functor(harden(hImport), harden(hOnce), harden(hLive));
      // initialized
    }
  }

  return harden({
    moduleRecord,
    moduleNS,
    notifiers,
    initialize
  });
}
