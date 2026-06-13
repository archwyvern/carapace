import { Diagnostic } from './diagnostic.js';

interface Macro {
  params: string[] | null;
  body: string;
}

interface JoinedLine {
  text: string;
  originalLine: number;
}

interface ConditionFrame {
  active: boolean;
  elseAllowed: boolean;
  anyBranchTaken: boolean;
}

interface PreprocessorOptions {
  macros?: Record<string, string | number>;
  filename?: string;
  includeLoader?: ((path: string) => string | null | undefined) | null;
  _includedPaths?: Set<string> | null;
}

export interface PreprocessorResult {
  output: string;
  sourceMap: number[];
  libraries: Set<string>;
  diagnostics: Diagnostic[];
}

// Strip comments from source, preserving newlines within block comments and
// not touching content inside string literals.
function stripComments(source: string): string {
  let result = '';
  let i = 0;
  const len = source.length;

  while (i < len) {
    // String literal -- pass through verbatim
    if (source[i] === '"') {
      result += source[i++];
      while (i < len && source[i] !== '"') {
        if (source[i] === '\\' && i + 1 < len) {
          result += source[i++];
        }
        result += source[i++];
      }
      if (i < len) {
        result += source[i++]; // closing "
      }
      continue;
    }

    // Line comment
    if (source[i] === '/' && i + 1 < len && source[i + 1] === '/') {
      i += 2;
      while (i < len && source[i] !== '\n') {
        i++;
      }
      // Leave the newline intact
      continue;
    }

    // Block comment
    if (source[i] === '/' && i + 1 < len && source[i + 1] === '*') {
      i += 2;
      while (i < len) {
        if (source[i] === '*' && i + 1 < len && source[i + 1] === '/') {
          i += 2;
          break;
        }
        // Preserve newlines, replace everything else with a space
        if (source[i] === '\n') {
          result += '\n';
        } else {
          result += ' ';
        }
        i++;
      }
      continue;
    }

    result += source[i++];
  }

  return result;
}

// Join backslash-continued lines. Returns an array of { text, originalLine }
// where originalLine is the 1-based source line that started this logical line.
function joinContinuations(source: string): JoinedLine[] {
  const rawLines = source.split('\n');
  const joined: JoinedLine[] = [];
  let i = 0;

  while (i < rawLines.length) {
    let text = rawLines[i];
    const originalLine = i + 1; // 1-based
    while (text.endsWith('\\')) {
      text = text.slice(0, -1); // remove trailing backslash
      i++;
      if (i < rawLines.length) {
        text += rawLines[i];
      }
    }
    joined.push({ text, originalLine });
    i++;
  }

  return joined;
}

// Expand macros in a single text string. Returns the expanded string.
// Skips content inside string literals.
function expandMacros(text: string, macros: Map<string, Macro>): string {
  const MAX_PASSES = 50;

  for (let pass = 0; pass < MAX_PASSES; pass++) {
    const expanded = expandMacrosOnce(text, macros);
    if (expanded === text) {
      break;
    }
    text = expanded;
  }

  // Apply ## token pasting
  text = applyTokenPaste(text);

  return text;
}

// One pass of macro expansion over the text. Returns new text.
// String literals are passed through without expansion.
function expandMacrosOnce(text: string, macros: Map<string, Macro>): string {
  let result = '';
  let i = 0;
  const len = text.length;
  let changed = false;

  while (i < len) {
    // Pass string literals through verbatim
    if (text[i] === '"') {
      result += text[i++];
      while (i < len && text[i] !== '"') {
        if (text[i] === '\\' && i + 1 < len) {
          result += text[i++];
        }
        result += text[i++];
      }
      if (i < len) {
        result += text[i++];
      }
      continue;
    }

    // Check for identifier start
    if (isIdentStart(text[i])) {
      const start = i;
      while (i < len && isIdentCont(text[i])) {
        i++;
      }
      const name = text.slice(start, i);

      if (!macros.has(name)) {
        result += name;
        continue;
      }

      const macro = macros.get(name)!;

      // Object-like macro
      if (macro.params === null) {
        result += macro.body;
        changed = true;
        continue;
      }

      // Function-like macro -- need to find '(' after optional whitespace
      let j = i;
      while (j < len && (text[j] === ' ' || text[j] === '\t')) {
        j++;
      }

      if (j >= len || text[j] !== '(') {
        // Not a call -- emit as-is
        result += name;
        continue;
      }

      // Parse arguments
      j++; // skip '('
      const args: string[] = [];
      let depth = 1;
      let arg = '';

      while (j < len && depth > 0) {
        if (text[j] === '(') {
          depth++;
          arg += text[j++];
        } else if (text[j] === ')') {
          depth--;
          if (depth === 0) {
            args.push(arg.trim());
            j++;
          } else {
            arg += text[j++];
          }
        } else if (text[j] === ',' && depth === 1) {
          args.push(arg.trim());
          arg = '';
          j++;
        } else {
          arg += text[j++];
        }
      }

      // Substitute parameters in body
      let body = macro.body;
      for (let p = 0; p < macro.params.length; p++) {
        const param = macro.params[p];
        const argVal = args[p] !== undefined ? args[p] : '';
        // Replace whole-word occurrences of param with argVal
        body = body.replace(new RegExp(`\\b${escapeRegExp(param)}\\b`, 'g'), argVal);
      }

      result += body;
      i = j;
      changed = true;
      continue;
    }

    result += text[i++];
  }

  return changed ? result : text;
}

// Apply ## token pasting: remove whitespace around ## and concatenate.
function applyTokenPaste(text: string): string {
  return text.replace(/\s*##\s*/g, '');
}

function isIdentStart(ch: string): boolean {
  return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_';
}

function isIdentCont(ch: string): boolean {
  return isIdentStart(ch) || (ch >= '0' && ch <= '9');
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Preprocessor expression evaluator.
// Returns an integer (0 or non-zero).
class ExprEvaluator {
  private input: string;
  private pos: number;
  private macros: Map<string, Macro>;

  constructor(expr: string, macros: Map<string, Macro>) {
    this.input = expr.trim();
    this.pos = 0;
    this.macros = macros;
  }

  private skipWS(): void {
    while (this.pos < this.input.length && ' \t'.includes(this.input[this.pos])) {
      this.pos++;
    }
  }

  evaluate(): number {
    const val = this.parseOr();
    return val;
  }

  private parseOr(): number {
    let left = this.parseAnd();
    while (true) {
      this.skipWS();
      if (this.input.startsWith('||', this.pos)) {
        this.pos += 2;
        const right = this.parseAnd();
        left = (left !== 0 || right !== 0) ? 1 : 0;
      } else if (this.matchKeyword('or')) {
        const right = this.parseAnd();
        left = (left !== 0 || right !== 0) ? 1 : 0;
      } else {
        break;
      }
    }
    return left;
  }

  private parseAnd(): number {
    let left = this.parseEq();
    while (true) {
      this.skipWS();
      if (this.input.startsWith('&&', this.pos)) {
        this.pos += 2;
        const right = this.parseEq();
        left = (left !== 0 && right !== 0) ? 1 : 0;
      } else if (this.matchKeyword('and')) {
        const right = this.parseEq();
        left = (left !== 0 && right !== 0) ? 1 : 0;
      } else {
        break;
      }
    }
    return left;
  }

  private parseEq(): number {
    let left = this.parseRel();
    while (true) {
      this.skipWS();
      if (this.input.startsWith('==', this.pos)) {
        this.pos += 2;
        const right = this.parseRel();
        left = left === right ? 1 : 0;
      } else if (this.input.startsWith('!=', this.pos)) {
        this.pos += 2;
        const right = this.parseRel();
        left = left !== right ? 1 : 0;
      } else {
        break;
      }
    }
    return left;
  }

  private parseRel(): number {
    let left = this.parseAdd();
    while (true) {
      this.skipWS();
      if (this.input.startsWith('<=', this.pos)) {
        this.pos += 2;
        const right = this.parseAdd();
        left = left <= right ? 1 : 0;
      } else if (this.input.startsWith('>=', this.pos)) {
        this.pos += 2;
        const right = this.parseAdd();
        left = left >= right ? 1 : 0;
      } else if (this.input[this.pos] === '<' && this.input[this.pos + 1] !== '<') {
        this.pos++;
        const right = this.parseAdd();
        left = left < right ? 1 : 0;
      } else if (this.input[this.pos] === '>' && this.input[this.pos + 1] !== '>') {
        this.pos++;
        const right = this.parseAdd();
        left = left > right ? 1 : 0;
      } else {
        break;
      }
    }
    return left;
  }

  private parseAdd(): number {
    let left = this.parseMul();
    while (true) {
      this.skipWS();
      if (this.input[this.pos] === '+') {
        this.pos++;
        const right = this.parseMul();
        left = left + right;
      } else if (this.input[this.pos] === '-') {
        this.pos++;
        const right = this.parseMul();
        left = left - right;
      } else {
        break;
      }
    }
    return left;
  }

  private parseMul(): number {
    let left = this.parseUnary();
    while (true) {
      this.skipWS();
      if (this.input[this.pos] === '*') {
        this.pos++;
        const right = this.parseUnary();
        left = left * right;
      } else if (this.input[this.pos] === '/' && this.input[this.pos + 1] !== '/') {
        this.pos++;
        const right = this.parseUnary();
        left = right !== 0 ? Math.trunc(left / right) : 0;
      } else if (this.input[this.pos] === '%') {
        this.pos++;
        const right = this.parseUnary();
        left = right !== 0 ? left % right : 0;
      } else {
        break;
      }
    }
    return left;
  }

  private parseUnary(): number {
    this.skipWS();
    if (this.input[this.pos] === '!') {
      this.pos++;
      const val = this.parseUnary();
      return val === 0 ? 1 : 0;
    }
    if (this.input[this.pos] === '-') {
      this.pos++;
      return -this.parseUnary();
    }
    if (this.input[this.pos] === '~') {
      this.pos++;
      return ~this.parseUnary();
    }
    if (this.matchKeyword('not')) {
      const val = this.parseUnary();
      return val === 0 ? 1 : 0;
    }
    return this.parsePrimary();
  }

  private parsePrimary(): number {
    this.skipWS();
    const ch = this.input[this.pos];

    // Integer literal (hex or decimal)
    if (ch >= '0' && ch <= '9') {
      const start = this.pos;
      // hex
      if (ch === '0' && this.pos + 1 < this.input.length &&
          (this.input[this.pos + 1] === 'x' || this.input[this.pos + 1] === 'X')) {
        this.pos += 2;
        while (this.pos < this.input.length && /[0-9a-fA-F]/.test(this.input[this.pos])) {
          this.pos++;
        }
      } else {
        while (this.pos < this.input.length && this.input[this.pos] >= '0' && this.input[this.pos] <= '9') {
          this.pos++;
        }
        // Skip trailing L/U suffixes
        while (this.pos < this.input.length && 'uUlL'.includes(this.input[this.pos])) {
          this.pos++;
        }
      }
      return parseInt(this.input.slice(start, this.pos), 0) || 0;
    }

    // Parenthesized expression
    if (ch === '(') {
      this.pos++;
      const val = this.parseOr();
      this.skipWS();
      if (this.input[this.pos] === ')') {
        this.pos++;
      }
      return val;
    }

    // Identifier (defined(), macro expansion, or 0)
    if (isIdentStart(ch)) {
      const start = this.pos;
      while (this.pos < this.input.length && isIdentCont(this.input[this.pos])) {
        this.pos++;
      }
      const name = this.input.slice(start, this.pos);

      if (name === 'defined') {
        this.skipWS();
        let hasParen = false;
        if (this.input[this.pos] === '(') {
          hasParen = true;
          this.pos++;
        }
        this.skipWS();
        const nameStart = this.pos;
        while (this.pos < this.input.length && isIdentCont(this.input[this.pos])) {
          this.pos++;
        }
        const macroName = this.input.slice(nameStart, this.pos);
        this.skipWS();
        if (hasParen && this.input[this.pos] === ')') {
          this.pos++;
        }
        return this.macros.has(macroName) ? 1 : 0;
      }

      // Expand macro value if defined (first expand, then re-evaluate)
      if (this.macros.has(name)) {
        const macro = this.macros.get(name)!;
        if (macro.params === null) {
          const bodyVal = parseInt(macro.body.trim(), 10);
          if (!isNaN(bodyVal)) {
            return bodyVal;
          }
          // Try recursive expression evaluation
          const sub = new ExprEvaluator(macro.body, this.macros);
          return sub.evaluate();
        }
      }

      // Undefined identifier evaluates to 0
      return 0;
    }

    return 0;
  }

  // Match a keyword (must not be followed by identifier chars)
  private matchKeyword(kw: string): boolean {
    this.skipWS();
    if (!this.input.startsWith(kw, this.pos)) {
      return false;
    }
    const after = this.pos + kw.length;
    if (after < this.input.length && isIdentCont(this.input[after])) {
      return false;
    }
    this.pos += kw.length;
    return true;
  }
}

function evaluateExpr(expr: string, macros: Map<string, Macro>): number {
  try {
    const ev = new ExprEvaluator(expr, macros);
    return ev.evaluate();
  } catch (e) {
    return 0;
  }
}

// Replace all `defined(NAME)` and `defined NAME` occurrences with 1 or 0
// before macro expansion, so the identifier is looked up as-is.
function resolveDefinedOps(expr: string, macros: Map<string, Macro>): string {
  // Match defined(NAME) or defined NAME
  return expr.replace(/\bdefined\s*\(\s*([A-Za-z_]\w*)\s*\)|\bdefined\s+([A-Za-z_]\w*)/g, (_: string, a: string | undefined, b: string | undefined) => {
    const name = a !== undefined ? a : b!;
    return macros.has(name) ? '1' : '0';
  });
}

export class Preprocessor {
  source: string;
  filename: string;
  includeLoader: ((path: string) => string | null | undefined) | null;
  macros: Map<string, Macro>;
  conditionStack: ConditionFrame[];
  libraries: Set<string>;
  diagnostics: Diagnostic[];
  sourceMap: number[];
  private _includedPaths: Set<string>;

  constructor(source: string, { macros = {}, filename = 'shader', includeLoader = null, _includedPaths = null }: PreprocessorOptions = {}) {
    this.source = source;
    this.filename = filename;
    this.includeLoader = includeLoader;
    this.macros = new Map();
    this.conditionStack = [];
    this.libraries = new Set();
    this.diagnostics = [];
    this.sourceMap = [];
    this._includedPaths = _includedPaths || new Set();
    for (const [name, body] of Object.entries(macros)) {
      this.macros.set(name, { params: null, body: String(body) });
    }
  }

  process(): PreprocessorResult {
    // Step 1: Strip comments
    const stripped = stripComments(this.source);

    // Step 2: Join backslash-continued lines
    const lines = joinContinuations(stripped);

    // Step 3: Process each logical line
    const outputLines: string[] = [];

    for (const { text, originalLine } of lines) {
      const trimmed = text.trimStart();

      if (trimmed.startsWith('#')) {
        const injected = this._processDirective(trimmed, originalLine);
        if (injected) {
          for (const line of injected) {
            outputLines.push(line);
            this.sourceMap.push(-1);
          }
        } else {
          outputLines.push('');
          this.sourceMap.push(originalLine);
        }
      } else {
        // Check if we're in an active block
        const active = this._isActive();

        if (active) {
          const expanded = expandMacros(text, this.macros);
          outputLines.push(expanded);
        } else {
          outputLines.push('');
        }
        this.sourceMap.push(originalLine);
      }
    }

    const output = outputLines.join('\n');
    return {
      output,
      sourceMap: this.sourceMap,
      libraries: this.libraries,
      diagnostics: this.diagnostics,
    };
  }

  private _isActive(): boolean {
    if (this.conditionStack.length === 0) {
      return true;
    }
    return this.conditionStack.every(frame => frame.active);
  }

  private _processDirective(text: string, lineNum: number): string[] | undefined {
    // text starts with '#', possibly with leading whitespace already trimmed
    const rest = text.slice(1).trimStart();
    const spaceIdx = rest.search(/[\s]/);
    let directive: string;
    let args: string;

    if (spaceIdx === -1) {
      directive = rest;
      args = '';
    } else {
      directive = rest.slice(0, spaceIdx);
      args = rest.slice(spaceIdx + 1);
    }

    // Directives that must be processed even when inactive (for nesting)
    const conditional = ['if', 'ifdef', 'ifndef', 'elif', 'else', 'endif'];
    const active = this._isActive();

    if (!active && !conditional.includes(directive)) {
      return; // Skip non-conditional directives in inactive blocks
    }

    switch (directive) {
      case 'define':
        this._processDefine(args, lineNum);
        break;
      case 'undef': {
        const name = args.trim();
        this.macros.delete(name);
        break;
      }
      case 'ifdef': {
        const name = args.trim();
        const defined = this.macros.has(name);
        this.conditionStack.push({ active: active && defined, elseAllowed: true, anyBranchTaken: defined });
        break;
      }
      case 'ifndef': {
        const name = args.trim();
        const defined = this.macros.has(name);
        this.conditionStack.push({ active: active && !defined, elseAllowed: true, anyBranchTaken: !defined });
        break;
      }
      case 'if': {
        let val = 0;
        if (active) {
          // Resolve 'defined(NAME)' before macro expansion so the name is
          // looked up in its original form, not after being replaced by its body.
          const predefined = resolveDefinedOps(args, this.macros);
          const expanded = expandMacros(predefined, this.macros);
          val = evaluateExpr(expanded, this.macros);
        }
        const taken = val !== 0;
        this.conditionStack.push({ active: active && taken, elseAllowed: true, anyBranchTaken: taken });
        break;
      }
      case 'elif': {
        const frame = this.conditionStack[this.conditionStack.length - 1];
        if (!frame || !frame.elseAllowed) {
          this.diagnostics.push(Diagnostic.error('#elif without matching #if', lineNum, 0, this.filename));
          break;
        }
        // Parent context must be active for this branch to potentially activate
        const parentActive = this.conditionStack.length < 2
          ? true
          : this.conditionStack.slice(0, -1).every(f => f.active);

        if (!frame.anyBranchTaken && parentActive) {
          const predefined = resolveDefinedOps(args, this.macros);
          const expanded = expandMacros(predefined, this.macros);
          const val = evaluateExpr(expanded, this.macros);
          const taken = val !== 0;
          frame.active = taken;
          frame.anyBranchTaken = taken;
        } else {
          frame.active = false;
        }
        break;
      }
      case 'else': {
        const frame = this.conditionStack[this.conditionStack.length - 1];
        if (!frame || !frame.elseAllowed) {
          this.diagnostics.push(Diagnostic.error('#else without matching #if', lineNum, 0, this.filename));
          break;
        }
        const parentActive = this.conditionStack.length < 2
          ? true
          : this.conditionStack.slice(0, -1).every(f => f.active);

        frame.active = parentActive && !frame.anyBranchTaken;
        frame.elseAllowed = false;
        break;
      }
      case 'endif': {
        if (this.conditionStack.length === 0) {
          this.diagnostics.push(Diagnostic.error('#endif without matching #if', lineNum, 0, this.filename));
        } else {
          this.conditionStack.pop();
        }
        break;
      }
      case 'include': {
        const trimArgs = args.trim();
        const angleMatch = trimArgs.match(/^<([^>]+)>/);
        const quoteMatch = trimArgs.match(/^"([^"]+)"/);
        if (angleMatch) {
          this.libraries.add(angleMatch[1]);
        } else if (quoteMatch) {
          const path = quoteMatch[1];
          if (!this.includeLoader) {
            this.diagnostics.push(Diagnostic.error(`cannot resolve include "${path}"`, lineNum, 0, this.filename));
            break;
          }
          if (this._includedPaths.has(path)) {
            this.diagnostics.push(Diagnostic.error(`circular include: "${path}"`, lineNum, 0, this.filename));
            break;
          }
          const content = this.includeLoader(path);
          if (content === null || content === undefined) {
            this.diagnostics.push(Diagnostic.error(`include file not found: "${path}"`, lineNum, 0, this.filename));
            break;
          }
          const nested = new Set(this._includedPaths);
          nested.add(path);
          const sub = new Preprocessor(content, {
            filename: path,
            includeLoader: this.includeLoader,
            _includedPaths: nested,
          });
          for (const [name, def] of this.macros) {
            sub.macros.set(name, def);
          }
          const subResult = sub.process();
          this.diagnostics.push(...subResult.diagnostics);
          for (const lib of subResult.libraries) {
            this.libraries.add(lib);
          }
          // Import any new macros defined in the included file
          for (const [name, def] of sub.macros) {
            this.macros.set(name, def);
          }
          if (subResult.diagnostics.some(d => d.severity === 'error')) break;
          return subResult.output.split('\n');
        } else {
          this.diagnostics.push(Diagnostic.error('expected <library> or "path" after #include', lineNum, 0, this.filename));
        }
        break;
      }
      case 'error': {
        const message = args.trim();
        this.diagnostics.push(Diagnostic.error(message, lineNum, 0, this.filename));
        break;
      }
      default:
        // Unknown directive -- silently ignore (could warn)
        break;
    }
  }

  private _processDefine(args: string, lineNum: number): void {
    // Check for function-like macro: NAME(params) body
    // Note: NO space between NAME and '('
    const funcMatch = args.match(/^([A-Za-z_]\w*)\(([^)]*)\)\s*(.*)/s);
    const objMatch = args.match(/^([A-Za-z_]\w*)(?:\s+(.*)|$)/s);

    if (funcMatch && args[funcMatch[1].length] === '(') {
      const name = funcMatch[1];
      const paramStr = funcMatch[2];
      const body = funcMatch[3] !== undefined ? funcMatch[3] : '';
      const params = paramStr.trim() === ''
        ? []
        : paramStr.split(',').map(p => p.trim());
      this.macros.set(name, { params, body });
    } else if (objMatch) {
      const name = objMatch[1];
      const body = objMatch[2] !== undefined ? objMatch[2] : '';
      this.macros.set(name, { params: null, body });
    } else {
      this.diagnostics.push(Diagnostic.error(`Invalid #define: ${args}`, lineNum, 0, this.filename));
    }
  }
}
