import { safeStringifyFunction } from './utilities';

export function applyTransforms(rewriterState, transforms) {
  const { create, getOwnPropertyDescriptors } = Object;
  const { apply } = Reflect;
  const uncurryThis = fn => (thisArg, ...args) => apply(fn, thisArg, args);
  const arrayReduce = uncurryThis(Array.prototype.reduce);

  // Clone before calling transforms.
  rewriterState = {
    src: `${rewriterState.src}`,
    endowments: create(
      null,
      getOwnPropertyDescriptors(rewriterState.endowments)
    )
  };

  // Rewrite the source, threading through rewriter state as necessary.
  rewriterState = arrayReduce(
    transforms,
    (rs, transform) => (transform.rewrite ? transform.rewrite(rs) : rs),
    rewriterState
  );

  // Clone after transforms
  rewriterState = {
    src: `${rewriterState.src}`,
    endowments: create(
      null,
      getOwnPropertyDescriptors(rewriterState.endowments)
    )
  };

  return rewriterState;
}

export const applyTransformsString = safeStringifyFunction(applyTransforms);
