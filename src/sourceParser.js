// https://www.ecma-international.org/ecma-262/9.0/index.html#sec-html-like-comments
// explains that JavaScript parsers may or may not recognize html
// comment tokens "<!--" and "-->" in non-module source text, and
// treat them as a kind of line comment. Since otherwise both of these
// can appear in normal JavaScript source code as a sequence of
// operators, we have the terrifying possibility of the same source
// code parsing one way on one correct JavaScript implementation, and
// another way on another.
//
// This shim takes the conservative strategy of just rejecting source
// text that contains these strings. Note that this very source file
// would be rejected by this test. If this became an issue, we'd need
// to rewrite it to preserve its behavior without mentioning these
// character strings explicitly.

const htmlCommentPattern = /^(.*)(<!--|-->)/;

function rejectHtmlComments(s) {
  const matches = htmlCommentPattern.exec(s);
  if (matches) {
    const linenum = matches[1].split('\n').length; // more or less
    throw new SyntaxError(
      `possible html comment syntax rejected around line ${linenum}`);
  }
}


// The proposed dynamic import expression is the only syntax currently
// proposed, that can appear in non-module JavaScript code, that
// enables direct access to the outside world that cannot be
// surpressed or intercepted without parsing and rewriting. Instead,
// this shim conservatively rejects any source text that seems to
// contain such an expression. To do this safely without parsing, we
// must also reject some valid programs, i.e., those containing
// apparent import expressions in literal strings or comments.

// The current conservative rule looks for the identifier "import"
// followed by either an open paren or something that looks like the
// beginning of a comment. We assume that we do not need to worry
// about html comment syntax because that was already rejected by
// rejectHtmlComments.

// this \s *must* match all kinds of syntax-defined whitespace. If e.g.
// U+2028 (LINE SEPARATOR) or U+2029 (PARAGRAPH SEPARATOR) is treated as
// whitespace by the parser, but not matched by /\s/, then this would admit
// an attack like: import\u2028('power.js') . We're trying to distinguish
// something like that from something like importnotreally('power.js') which
// is perfectly safe.

const importPattern = /^(.*)\bimport\s*(\(|\/\/|\/\*)/m;

function rejectImportExpressions(s) {
  const matches = importPattern.exec(s);
  if (matches) {
    // todo: if we have a full parser available, use it here. If there is no
    // 'import' token in the string, we're safe.
    // if (!parse(s).contains('import')) return;
    const linenum = matches[1].split('\n').length; // more or less
    throw new SyntaxError(
      `possible import expression rejected around line ${linenum}`);
  }
}

export function rejectDangerousSources(s) {
  rejectHtmlComments(s);
  rejectImportExpressions(s);
}
