/*global mu harden*/
//---------

// An example of original module source:

// import ex as im from 'foo';
// export let mu = 88;
// mu = 99;
// export let co == 77;

// "ex" is the exportName, the name under which module "foo" exports a
// binding.
//
// "im" in the lexical variable name within this module bound to the
// "foo" module's "ex" export.
//
// "mu" is a lexical variable declared, exported from this module, and
// assigned to within this module. Thus, we need a binding that can be
// updated by assignment. We can transform the declaration because it
// must appear at top level, and therefore outside any functions in
// the module. However, we cannot transform the assignments because
// that can appear within functions. Since this case is rare, it is ok
// for it to transform into something expensive, i.e., a free variable
// whose accesses cause a proxy trap.
//
// "co" is a lexical declared variable, exported from this module, but
// never assigned to within this module. Thus, the variable within
// this module can become a `const` declaration. We still need a live
// binding because it is still in temporal dead zone until initialized.

//---------

// Turn the module above into a generator, whose phases reflect the
// phases of initializing a group of modules. This way, we can execute
// the first phases of all the modules in a group before executing any
// second phases, etc, while keeping all the phases of each module in
// the same module scope.
//
// The first phase yields a description of the exports of this
// module. This export description is a record of objects
// encapsulating the state of each exported live binding.
//
// The second phase is provided the $h_import giving access to all the
// bindings that this module imports from the exports of other modules.
//
// The third phase is the actual module initialization, where we
// execute the transformed body of the module. This phase is provided
// the $h_init record of init functions, used to initialize declared
// exported bindings, so they are no longer in a temporal dead zone.
//
// Even aside from the free variables of the original module source,
// this transformed module has free variables for every variable, like
// `mu`, that the original module source both exports and anywhere
// assigns to. This generator must be executed in a `with(aProxy)`
// environment so that assignments to these variables can be trapped,
// to update the live bindings of the import variables bound to this
// export.
(function* () {
  
  // export phase
  const $h_import = yield {
    mu: true,
    co: false
  };

  // import phase
  let im;
  $h_import['foo'].ex(n => {im = n;});
  const $h_init = yield;

  // module body
  $h_init.mu(88);
  mu = 99;  // free assignment trapped by the surrounding `with(aProxy)`
  const co = $h_init.co(77);
});

//---------

function makeRWExport(name) {
  const qname = JSON.stringify(name);
  let value = undefined;
  let raw = true;
  const observers = [];

  const get = () => {
    if (raw) { throw new ReferenceError(`${qname} not initialized`); }
    return value;
  };
  const observe = observer => {
    observers.push(observer);
    if (!raw) { observer(value); }
  };
  const set = newValue => {
    if (raw) { throw new ReferenceError(`${qname} not initialized`); }
    value = newValue;
    for (let observer of observers) { observer(newValue); }
  };
  const init = initValue => {
    if (!raw) { throw new Error(`Internal: ${qname} initialized twice`); }
    raw = false;
    set(initValue);
  };
  
  return harden({
    moduleDesc: {
      get,
      enumerable: true,
      configurable: false
    },
    optEndowmentDesc: {
      get,
      set,
      enumerable: true,
      configurable: false
    },
    observe,
    init
  });
}

function makeROExport(name) {
  const qname = JSON.stringify(name);
  let raw = true;
  let value = undefined;
  const optObservers = [];

  const get = () => {
    if (raw) { throw new ReferenceError(`${qname} not initialized`); }
    return value;
  };
  const observe = observer => {
    if (raw) {
      optObservers.push(observer);
    } else {
      observer(value);
    }
  };
  const init = initValue => {
    if (!raw) { throw new Error(`Internal: ${qname} initialized twice`); }
    raw = false;
    value = initValue;
    for (let observer of optObservers) { observer(initValue); }
    optObservers = null;
  };
  
  return harden({
    moduleDesc: {
      get,
      enumerable: true,
      configurable: false
    },
    observe,
    init
  });
}



function makeHExport(
  // Pass in an empty expensible object. hExport will make it into an
  // emulated module namespace object and harden it.
  moduleNS,
  
  // Pass in a pre-populated object to be used as the endowments for a
  // realm.evaluate on the module as translated to an evaluable
  // script. hExport will add bindings for names in the module-shim
  // reserved namespace, i.e., names beginning with "$h_", which
  // should not interfere with an of the pre-populated names. Then
  // freeze the endowments object. Do not yet harden it, because its
  // $h_import may not yet be populated.
  //
  // TODO we should verify that endowments has no names in this
  // reserved namespace. The lack of such verification should not be a
  // security hole, because any module code that uses reserved names
  // should get them from a source that shadows or replaces any
  // prior/illegitimate definitions of these reserved names.
  endowments,

  // Pass in an empty extensible object. hExport will populate it with
  // observe callback functions with which importers of this module
  // can register observers to update their imported variables. It
  // will also populate it with an "export" property mapping to the
  // module namespace object itself. hExport then hardens
  // observes. This should not conflict with any exportNames because
  // "export" is a keyword other than "default".
  observes,

  // Pass in an object that will be populated with the namespaces from
  // which this module will obtain its imports. This will include the
  // observes object representing the exports of other
  // modules. hExport does not freeze or harden hImport because it
  // may not yet be populated.
  hImport

  // Returns the hExport function defined below
) {
  const { defineProperty: defProp, create, freeze, entries } = Object;
  const result = create(null);

  // exportStates is a record mapping from exportNames to either
  // RWExportState or ROExportState objects, made by makeRWExport
  // or makeROExport
  //
  // Returns a record mapping from exportNames to init functions, used
  // to transition the variable from an unintialized to an initialied
  // state.
  function hExport(exportStates) {
    for (let [exportName, exportState] of entries(exportStates)) {
      defProp(moduleNS, exportName, exportState.moduleDesc);
      const optEDesc = exportState.optEndowmentDesc;
      if (optEDesc) {
        defProp(endowments, exportName, optEDesc);
      }
      observes[exportName] = exportState.observe;
      result[exportName] = exportState.init;
    }

    freeze(endowments);
    observes.export = moduleNS;
    harden(observes);
    return harden(result);
  };
  return harden(hExport);
}
