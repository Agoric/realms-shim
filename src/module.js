/* global mu lo x g */

// TODO fix: get these from the right place
const harden = Object.freeze;
const {
  getOwnPropertyDescriptors: getProps,
  defineProperty: defProp,
  create,
  entries
} = Object;
function makeMap(...args) {
  return harden(new Map(...args));
}

// See https://tc39.github.io/ecma262/#importentry-record for
// terminology and examples.
// "tdz" is "temporal dead zone"

// A bit of terminology change:
// A ModuleStaticRecord contains only static info derived from the
// module source text in isolation.
// A ModuleInstance is an object much like the "ModuleRecord" of the
// spec that corresponds to an individual instantiation of a
// ModuleStaticRecord in naming environments.

// ModuleStaticRecord: {
//   // Accurately verify has no "h$_stuff" variable names.
//   moduleSource: original string,
//   // rest are generated from moduleSource
//   importEntries: [ [specifierName, [importName*]]* ]
//   liveExportEntries: [ [liveExportName, [localName?]]* ]
//   fixedExports: [fixedExportName*],
//   functorSource: rewritten string
//   optSourceMap: from moduleSource to functorSource
// }

// Example for module bar. barModuleStaticRecord.moduleSource is the
// hypothetical source string from which the rest of
// barModuleStaticRecord is generated.

const barModuleStaticRecord = harden({
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

  // [ [specifierName, [importName*]]* ]
  // Record of imported module specifier names to list of importNames.
  // The importName '*' is that module's module namespace object.
  importEntries: [
    ['mod1', ['default', '*']],
    ['mod2', ['x']],
    ['mod3', []],
    ['foo', ['f', 'g']]
  ],

  // [ [liveExportName, [localName?]]* ]
  // exportNames of variables that are assigned to, or reexported and
  // therefore assumed live. A reexported variable might not have any
  // localName.
  //
  // We say "['vv', []]" rather than "['vv', ['w']]" since
  // 'w' is the local name we're exporting as vv. However, it
  // translates to a declared local name, whereas the localNames of
  // the liveExportEntries are used to set up proxy trapping, which
  // doesn't apply to reexported names.
  liveExportEntries: [
    ['mu', ['mu']],
    ['ex', ['lo']],
    ['vv', []],
    ['f', []],
    ['h', []]
  ],

  // [fixedExportName*]
  // exportNames of variables that are only initialized and used, but
  // never assigned to. The exportName 'default' has no localName.
  fixedExports: ['co', 'default', 'xx'],

  functorSource: `(${function($h_import, $h_once, $h_live) {
    // import section
    let v, ns, x, w;
    $h_import([
      [
        'mod1',
        [
          [
            'default',
            [
              $h_a => {
                v = $h_a;
              }
            ]
          ],
          [
            '*',
            [
              $h_a => {
                ns = $h_a;
              }
            ]
          ]
        ]
      ],
      [
        'mod2',
        [
          [
            'x',
            [
              $h_live.vv,
              $h_a => {
                x = $h_a;
              },
              $h_a => {
                w = $h_a;
              }
            ]
          ]
        ]
      ],
      ['mod3', []],
      ['foo', [['f', [$h_live.f]], ['g', [$h_live.h]]]]
    ]);

    // rewritten body
    $h_live.mu(88);
    mu = mu + 1; // mu is free so that access will proxy-trap
    $h_live.ex(22);
    lo = lo + 1; // lo is free so that access will proxy-trap

    const co = $h_once.co(77);
    $h_once.default(42);
    const xx = $h_once.xx(33);
  }})`
});

//---------

// The modules that barModule imports from.
// For this first test, we have no cycles.

const mod1ModuleStaticRecord = harden({
  moduleSource: `\
export default 'v';
export const v2 = 'v2';
`,
  importEntries: [],
  liveExportEntries: [],
  fixedExports: ['default', 'v2'],

  functorSource: `(${function($h_import, $h_once, $h_live) {
    $h_import([]);

    const v = $h_once.default('v');
    const v2 = $h_once.vv('v2');
  }})`
});

const mod2ModuleStaticRecord = harden({
  moduleSource: `\
export let x = 'x';
x = 'xChanged';
`,
  importEntries: [],
  liveExportEntries: [['x', ['x']]],
  fixedExports: [],

  functorSource: `(${function($h_import, $h_once, $h_live) {
    $h_import([]);

    $h_live.x('x');
    x = 'xChanged';
  }})`
});

const mod3ModuleStaticRecord = harden({
  moduleSource: '',
  importEntries: [],
  liveExportEntries: [],
  fixedExports: [],
  functorSource: `(${function($h_import, $h_once, $h_live) {
    $h_import([]);
  }})`
});

const fooModuleStaticRecord = harden({
  moduleSource: `\
export const f = 'f';
export let g = 'g';
g = 'gChanged';
`,
  importEntries: [],
  liveExportEntries: [['g', ['g']]],
  fixedExports: ['f'],
  functorSource: `(${function($h_import, $h_once, $h_live) {
    $h_import([]);

    const f = $h_once.f('f');
    $h_live.g('g');
    g = 'gChanged';
  }})`
});

//---------

// By providing this, the rest of this module does not need to cope
// with preEndowments. Rather, clients wishing to pass in
// preEndowments should just curry it into the evaluate function they
// pass us.
function currySomeEndowments(preEvaluate, preEndowmentNS) {
  return function evaluate(src, endowments) {
    // TODO should check for collisions.
    // TODO should check that preEndowments has no $h_stuff names.
    // Neither is a security hole since trappers replace conflicting
    // preEndowments
    const allEndowmentNS = Object.create(null, {
      ...getProps(preEndowmentNS),
      ...getProps(endowments)
    });
    return preEvaluate(src, allEndowmentNS);
  };
}

// importInstanceMap = Map[specifier, ModuleInstance]
// evaluate(string, endowmentNS) -> result
//
// return ModuleInstance = {
//   moduleStaticRecord,
//   moduleNS: { _exportName_: getter },
//   notifierNS: { _importName_: notify(update(newValue))},
//   initialize()
// }
function makeModuleInstance(moduleStaticRecord, importInstanceMap, evaluate) {
  // {_exportName_: getter} module namespace object
  const moduleNS = create(null);

  // {_localName_: accessor} added to endowments for proxy traps
  const endowmentNS = create(null);

  // {_fixedExportName_: init(initValue) -> initValue} used by the
  // rewritten code to initialize exported fixed bindings.
  const hOnceNS = create(null);

  // {_liveExportName_: update(newValue)} used by the rewritten code to
  // both initiailize and update live bindings.
  const hLiveNS = create(null);

  // {_importName_: notify(update(newValue))} Used by code that imports
  // one of this module's exports, so that their update function will
  // be notified when this binding is initialized or updated.
  const notifierNS = create(null);

  for (const fixedExportName of moduleStaticRecord.fixedExports) {
    // fixed binding state
    let value = undefined;
    let tdz = true;
    let optUpdaters = []; // optUpdaters === null iff tdz === false

    // tdz sensitive getter
    function get() {
      if (tdz) {
        const qname = JSON.stringify(fixedExportName);
        throw new ReferenceError(`binding ${qname} not yet initialized`);
      }
      return value;
    }

    // Leave tdz once. Init with initValue of a declared const
    // binding, and return it.
    function init(initValue) {
      if (!tdz) {
        const qname = JSON.stringify(fixedExportName);
        throw new Error(`Internal: binding ${qname} already initialized`);
      }
      value = initValue;
      const updaters = optUpdaters;
      optUpdaters = null;
      tdz = false;
      for (const updateFN of updaters) {
        updateFN(initValue);
      }
      return initValue;
    }

    // If still tdz, register update for notification later.
    // Otherwise, update now.
    function notify(updateFN) {
      if (tdz) {
        optUpdaters.push(updateFN);
      } else {
        updateFN(value);
      }
    }

    defProp(moduleNS, fixedExportName, {
      get,
      set: undefined,
      enumerable: true,
      configurable: false
    });

    hOnceNS[fixedExportName] = init;
    notifierNS[fixedExportName] = notify;
  }

  for (const [liveExportName, vars] of moduleStaticRecord.liveExportEntries) {
    // live binding state
    let value = undefined;
    let tdz = true;
    const updaters = [];

    // tdz sensitive getter
    function get() {
      if (tdz) {
        const qname = JSON.stringify(liveExportName);
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
    // module instance isn't initialized yet, as may happen in cycles.
    function update(newValue) {
      value = newValue;
      tdz = false;
      for (const updateFN of updaters) {
        updateFN(newValue);
      }
    }

    // tdz sensitive setter
    function set(newValue) {
      if (tdz) {
        const qname = JSON.stringify(liveExportName);
        throw new ReferenceError(`binding ${qname} not yet initialized`);
      }
      value = newValue;
      for (const updateFN of updaters) {
        updateFN(newValue);
      }
    }

    // Always register the update function.
    // If not in tdz, also update now.
    function notify(updateFN) {
      updaters.push(updateFN);
      if (!tdz) {
        updateFN(value);
      }
    }

    defProp(moduleNS, liveExportName, {
      get,
      set: undefined,
      enumerable: true,
      configurable: false
    });

    for (const localName of vars) {
      defProp(endowmentNS, localName, {
        get,
        set,
        enumerable: true,
        configurable: false
      });
    }

    hLiveNS[liveExportName] = update;
    notifierNS[liveExportName] = notify;
  }

  // '*' cannot be a live binding, so do not need to add to any list
  // of updaters.
  function notifyStar(updateFN) {
    updateFN(moduleNS);
  }
  notifierNS['*'] = notifyStar;

  // The importUpdateEntries must conform to moduleStaticRecord.importEntries
  // importUpdateEntries = [ [specifier, updateEntries]* ]
  // updateEntries = [ [importName, [update(newValue)*]]* ]
  function hImport(importUpdateEntries) {
    // By the time hImport is called, the importInstanceMap should
    // already be initialized with module instances that satisfy
    // moduleStaticRecord.importEntries.
    for (const [specifier, updateEntries] of importUpdateEntries) {
      const instance = importInstanceMap.get(specifier);
      instance.initialize(); // bottom up cycle tolerant
      const notifiers = instance.notifierNS;
      for (const [importName, updaters] of updateEntries) {
        const notify = notifiers[importName];
        for (const updateFN of updaters) {
          notify(updateFN);
        }
      }
    }
  }

  let optFunctor = evaluate(moduleStaticRecord.functorSource, endowmentNS);
  function initialize() {
    if (optFunctor) {
      // uninitialized
      const functor = optFunctor;
      optFunctor = null;
      // initializing
      functor(harden(hImport), harden(hOnceNS), harden(hLiveNS));
      // initialized
    }
  }

  return harden({
    moduleStaticRecord,
    moduleNS,
    notifierNS,
    initialize
  });
}

//---------

// staticModuleMap = Map[moduleStaticRecord,
//                       [ [specifierName, moduleStaticRecord]* ]
//                      ]
// Loading, renaming, and wiring produces staticModuleMap where, each
// moduleStaticRecord key maps to an entries mapping from the
// key module's imported specifierNames to the staticModuleRecord
// whose exports satisfy the imports of that the key module associates
// with specifierName.

const barStaticModuleMap = harden(
  makeMap([
    [
      barModuleStaticRecord,
      [
        ['mod1', mod1ModuleStaticRecord],
        ['mod2', mod2ModuleStaticRecord],
        ['mod3', mod3ModuleStaticRecord],
        ['foo', fooModuleStaticRecord]
      ]
    ],
    [mod1ModuleStaticRecord, []],
    [mod2ModuleStaticRecord, []],
    [mod3ModuleStaticRecord, []],
    [fooModuleStaticRecord, []]
  ])
);

function validateImportsSatisfied(specifierName, importNames, exportingModule) {
  const exportSet = new Set(exportingModule.fixedExports);
  for (const [name, _] of exportingModule.liveExportEntries) {
    exportSet.add(name);
  }
  for (const importName of importNames) {
    if (importName !== '*' && !exportSet.has(importName)) {
      const qsname = JSON.stringify(specifierName);
      const qiname = JSON.stringify(importName);
      throw new TypeError(`Link error: Expected ${qsname} to export ${qiname}`);
    }
  }
}

function validateStaticModuleMap(staticModuleMap) {
  for (const [importingModule, exportEntries] of staticModuleMap) {
    const exportMap = makeMap(exportEntries);
    for (const [specifierName, importNames] of importingModule.importEntries) {
      const exportingModule = exportMap.get(specifierName);
      if (!exportingModule) {
        const qname = JSON.stringify(specifierName);
        throw new TypeError(`Link error: No module at ${qname}`);
      }
      if (!staticModuleMap.has(exportingModule)) {
        const qname = JSON.stringify(specifierName);
        throw new TypeError(`Load error: ${qname} not in static map`);
      }
      validateImportsSatisfied(specifierName, importNames, exportingModule);
    }
  }
}

validateStaticModuleMap(barStaticModuleMap);

//---------

// Instantiation phase produces a linked module instance. A module
// instance is linked when its importInstanceMap is populated with
// linked module instances that instantiate the corresponding static
// module in the staticModuleMap.

function makeLinkedInstance(
  moduleStaticRecord,
  staticModuleMap,
  evaluate,
  key,
  registry = makeMap()
) {
  let linkedInstance = registry.get(key);
  if (linkedInstance) {
    return linkedInstance;
  }

  const linkedInstanceMap = makeMap();
  linkedInstance = makeModuleInstance(
    moduleStaticRecord,
    linkedInstanceMap, // empty at this time
    evaluate
  );
  registry.set(key, linkedInstance);

  for (const [modName, _] of entries(moduleStaticRecord.importEntries)) {
    const exportingModuleRecord = staticModuleMap.get(modName);
    const exportingInstance = makeLinkedInstance(
      exportingModuleRecord,
      staticModuleMap,
      evaluate,
      exportingModuleRecord,
      registry
    );
    linkedInstanceMap.set(modName, exportingInstance);
  }

  return linkedInstance;
}

function testBar(evaluate) {
  const barInstance = makeLinkedInstance(
    barModuleStaticRecord,
    barStaticModuleMap,
    evaluate,
    barModuleStaticRecord
  );
  barInstance.initialize();
  return barInstance;
}
