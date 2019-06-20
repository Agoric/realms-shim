// this \s *must* match all kinds of syntax-defined whitespace. If e.g.
// U+2028 (LINE SEPARATOR) or U+2029 (PARAGRAPH SEPARATOR) is treated as
// whitespace by the parser, but not matched by /\s/, then this would admit
// an attack like: import\u2028('power.js') . We're trying to distinguish
// something like that from something like importnotreally('power.js') which
// is perfectly safe.

const importParser = /\bimport\s*(?:\(|\/[/*])/;

export function parseSource(s, options) {
  const { infixBangResolver } = Object(options);

  // eslint-disable-next-line global-require
  const parser = require('@agoric/babel-parser');
  if (infixBangResolver) {
    return parser.parse(s, {
      plugins: [['infixBang', { resolver: infixBangResolver }]]
    });
  }
  return parser.parse(s);
}

export function generateSource(s, ast) {
  // eslint-disable-next-line global-require
  const { default: generate } = require('@babel/generator');
  const { code } = generate(ast, {}, s);
  return code;
}

export function rejectImportExpressions(s, ast) {
  if (!ast) {
    // We didn't yet do a full parse, so try the cheap regexp first.
    const index = s.search(importParser);
    if (index === -1) {
      // No possible import expression.
      return;
    }

    // if we have a full parser available, use it here. Below we check the
    // resulting ast.
    try {
      ast = parseSource(s);
    } catch (e) {
      const linenum = s.slice(0, index).split('\n').length; // more or less
      throw new SyntaxError(`possible import expression rejected around line ${linenum}: ${e}`);
    }
  }

  // We have a parse, so traverse it.
  // eslint-disable-next-line global-require
  const { default: traverse } = require('@babel/traverse');
  traverse(ast, {
    CallExpression(path) {
      if (path.node.callee.type === 'Import') {
        throw path.buildCodeFrameError(`import expression rejected`);
      }
    }
  });
}
