/**
 * RootFinder Studio v3.0 - Numerical Methods Root-Finding Application
 * Bisection, Secant, and Newton-Raphson methods with full interactive visualization.
 */

(function () {
  'use strict';

  /* ==========================================================================
     1. MATHEMATICAL EXPRESSION PARSER & EVALUATOR
     ========================================================================== */

  // Additional trigonometric & hyperbolic math functions
  const MATH_EXT = {
    abs: Math.abs,
    sin: Math.sin,
    cos: Math.cos,
    tan: Math.tan,
    sec: (x) => {
      const c = Math.cos(x);
      if (Math.abs(c) < 1e-15) throw new Error("sec(x): division by zero");
      return 1 / c;
    },
    csc: (x) => {
      const s = Math.sin(x);
      if (Math.abs(s) < 1e-15) throw new Error("csc(x): division by zero");
      return 1 / s;
    },
    cosec: (x) => {
      const s = Math.sin(x);
      if (Math.abs(s) < 1e-15) throw new Error("cosec(x): division by zero");
      return 1 / s;
    },
    cot: (x) => {
      const s = Math.sin(x);
      if (Math.abs(s) < 1e-15) throw new Error("cot(x): division by zero");
      return Math.cos(x) / s;
    },
    asin: Math.asin,
    acos: Math.acos,
    atan: Math.atan,
    sinh: Math.sinh,
    cosh: Math.cosh,
    tanh: Math.tanh,
    sech: (x) => {
      const c = Math.cosh(x);
      if (Math.abs(c) < 1e-15) throw new Error("sech(x): division by zero");
      return 1 / c;
    },
    csch: (x) => {
      const s = Math.sinh(x);
      if (Math.abs(s) < 1e-15) throw new Error("csch(x): division by zero");
      return 1 / s;
    },
    coth: (x) => {
      const t = Math.tanh(x);
      if (Math.abs(t) < 1e-15) throw new Error("coth(x): division by zero");
      return 1 / t;
    },
    asinh: Math.asinh,
    acosh: Math.acosh,
    atanh: Math.atanh,
    exp: Math.exp,
    log: Math.log,
    ln: Math.log,
    log10: Math.log10,
    log2: Math.log2,
    sqrt: Math.sqrt,
    cbrt: Math.cbrt,
    pi: Math.PI,
    e: Math.E
  };

  /**
   * Tokenizer & Parser for natural mathematical expressions.
   * Expands implicit multiplication: 2x -> 2*x, 3sin(x) -> 3*sin(x), (x+1)(x-1) -> (x+1)*(x-1)
   * Converts ^ to exponentiation.
   */
  class MathParser {
    static sanitize(expr) {
      if (!expr || typeof expr !== 'string') return '';
      let s = expr.trim();
      s = s.replace(/×/g, '*').replace(/÷/g, '/');
      return s;
    }

    /**
     * Preprocesses math expression string to inject multiplication and standardize operators.
     */
    static preprocess(rawExpr) {
      let s = MathParser.sanitize(rawExpr);
      if (!s) throw new Error("Empty expression");

      // Replace ^ with ** for power
      // Implicit multiplication replacements:
      // 1. ) followed by ( or variable/number: ) ( -> )*( , )(x -> )*(x
      s = s.replace(/\)\s*(?=[(\w])/g, ')*');
      // 2. Number followed by letter or function: 2x -> 2*x, 3sin -> 3*sin, 4.5e -> 4.5*e (unless scientific notation like 1e5)
      s = s.replace(/(?<![a-zA-Z_])(\d+\.?\d*)\s*(?!(?:[eE][+-]?\d+))([a-zA-Z_]\w*)/g, '$1*$2');
      // 3. Number followed by (: 2(x+1) -> 2*(x+1)
      s = s.replace(/(?<![a-zA-Z_])(\d+\.?\d*)\s*(?=\()/g, '$1*');
      // 4. Variable x followed by letter, function, or (: x(x+1) -> x*(x+1), x sin(x) -> x*sin(x)
      s = s.replace(/\bx\b\s*(?=[a-zA-Z_]|\()/g, 'x*');
      // 5. Clean duplicate multiplication operators that might have been created
      s = s.replace(/\*{2,}/g, '^'); // preserve intentional power or collapse
      s = s.replace(/\*+/g, '*');
      s = s.replace(/\*\^/g, '^');
      return s;
    }

    /**
     * Compile expression to an AST or evaluatable function f(x)
     */
    static compile(exprStr) {
      const cleanExpr = MathParser.preprocess(exprStr);

      // Tokenize
      const tokens = MathParser.tokenize(cleanExpr);
      const rpn = MathParser.toRPN(tokens);

      return function evaluate(x) {
        return MathParser.evaluateRPN(rpn, x);
      };
    }

    static tokenize(str) {
      const tokens = [];
      let i = 0;
      const len = str.length;

      while (i < len) {
        const c = str[i];

        if (/\s/.test(c)) {
          i++;
          continue;
        }

        // Numbers: digits and decimals, including scientific notation 1e-4
        if (/\d/.test(c) || (c === '.' && /\d/.test(str[i + 1] || ''))) {
          let numStr = '';
          while (i < len && (/[\d.]/.test(str[i]) || ((str[i] === 'e' || str[i] === 'E') && /[+-]?\d/.test(str.substr(i + 1, 2))))) {
            if (str[i] === 'e' || str[i] === 'E') {
              numStr += str[i++];
              if (str[i] === '+' || str[i] === '-') numStr += str[i++];
            } else {
              numStr += str[i++];
            }
          }
          tokens.push({ type: 'NUM', value: parseFloat(numStr) });
          continue;
        }

        // Identifiers: variables (x), constants (pi, e), or function names (sin, cos)
        if (/[a-zA-Z_]/.test(c)) {
          let id = '';
          while (i < len && /[a-zA-Z0-9_]/.test(str[i])) {
            id += str[i++];
          }
          const lower = id.toLowerCase();
          if (lower === 'x') {
            tokens.push({ type: 'VAR', value: 'x' });
          } else if (lower === 'pi') {
            tokens.push({ type: 'NUM', value: Math.PI });
          } else if (lower === 'e' && tokens.length > 0 && tokens[tokens.length - 1].type === 'NUM') {
            // Already handled in number scanner, but just in case
            tokens.push({ type: 'NUM', value: Math.E });
          } else if (lower === 'e') {
            tokens.push({ type: 'NUM', value: Math.E });
          } else if (MATH_EXT[lower]) {
            tokens.push({ type: 'FUNC', value: lower });
          } else {
            throw new Error(`Unknown function or symbol: "${id}"`);
          }
          continue;
        }

        // Operators & Parentheses
        if ('+-*/^(),'.includes(c)) {
          // Detect unary minus/plus: at start, or after an operator or '('
          if (c === '-' || c === '+') {
            const prev = tokens[tokens.length - 1];
            if (!prev || prev.type === 'OP' || prev.type === 'LPAREN' || prev.type === 'COMMA') {
              tokens.push({ type: 'UNARY', value: c === '-' ? 'neg' : 'pos' });
              i++;
              continue;
            }
          }

          if (c === '(') tokens.push({ type: 'LPAREN' });
          else if (c === ')') tokens.push({ type: 'RPAREN' });
          else if (c === ',') tokens.push({ type: 'COMMA' });
          else tokens.push({ type: 'OP', value: c });
          i++;
          continue;
        }

        throw new Error(`Unexpected character: "${c}"`);
      }
      return tokens;
    }

    // Shunting-yard algorithm: Infix -> Reverse Polish Notation (RPN)
    static toRPN(tokens) {
      const output = [];
      const opStack = [];

      const precedence = {
        '+': 1,
        '-': 1,
        '*': 2,
        '/': 2,
        'neg': 3,
        'pos': 3,
        '^': 4
      };

      const rightAssoc = {
        '^': true,
        'neg': true,
        'pos': true
      };

      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];

        if (token.type === 'NUM' || token.type === 'VAR') {
          output.push(token);
        } else if (token.type === 'FUNC') {
          opStack.push(token);
        } else if (token.type === 'COMMA') {
          while (opStack.length > 0 && opStack[opStack.length - 1].type !== 'LPAREN') {
            output.push(opStack.pop());
          }
          if (opStack.length === 0) throw new Error("Mismatched comma or parentheses");
        } else if (token.type === 'OP' || token.type === 'UNARY') {
          const o1 = token.value;
          while (opStack.length > 0) {
            const top = opStack[opStack.length - 1];
            if (top.type === 'OP' || top.type === 'UNARY') {
              const o2 = top.value;
              const p1 = precedence[o1];
              const p2 = precedence[o2];
              if ((!rightAssoc[o1] && p1 <= p2) || (rightAssoc[o1] && p1 < p2)) {
                output.push(opStack.pop());
                continue;
              }
            }
            break;
          }
          opStack.push(token);
        } else if (token.type === 'LPAREN') {
          opStack.push(token);
        } else if (token.type === 'RPAREN') {
          let foundLparen = false;
          while (opStack.length > 0) {
            const top = opStack.pop();
            if (top.type === 'LPAREN') {
              foundLparen = true;
              break;
            }
            output.push(top);
          }
          if (!foundLparen) throw new Error("Mismatched parentheses");
          if (opStack.length > 0 && opStack[opStack.length - 1].type === 'FUNC') {
            output.push(opStack.pop());
          }
        }
      }

      while (opStack.length > 0) {
        const top = opStack.pop();
        if (top.type === 'LPAREN' || top.type === 'RPAREN') {
          throw new Error("Mismatched parentheses");
        }
        output.push(top);
      }

      return output;
    }

    static evaluateRPN(rpn, x) {
      const stack = [];

      for (let i = 0; i < rpn.length; i++) {
        const token = rpn[i];

        if (token.type === 'NUM') {
          stack.push(token.value);
        } else if (token.type === 'VAR') {
          stack.push(x);
        } else if (token.type === 'UNARY') {
          if (stack.length < 1) throw new Error("Invalid unary expression");
          const v = stack.pop();
          stack.push(token.value === 'neg' ? -v : v);
        } else if (token.type === 'OP') {
          if (stack.length < 2) throw new Error("Invalid binary expression");
          const b = stack.pop();
          const a = stack.pop();
          switch (token.value) {
            case '+': stack.push(a + b); break;
            case '-': stack.push(a - b); break;
            case '*': stack.push(a * b); break;
            case '/':
              if (Math.abs(b) < 1e-15) stack.push(a >= 0 ? Infinity : -Infinity);
              else stack.push(a / b);
              break;
            case '^': stack.push(Math.pow(a, b)); break;
            default: throw new Error(`Unknown operator: ${token.value}`);
          }
        } else if (token.type === 'FUNC') {
          if (stack.length < 1) throw new Error(`Function ${token.value} requires an argument`);
          const arg = stack.pop();
          const fn = MATH_EXT[token.value];
          if (!fn) throw new Error(`Unknown function: ${token.value}`);
          stack.push(fn(arg));
        }
      }

      if (stack.length !== 1) throw new Error("Evaluation error: invalid stack length");
      const res = stack[0];
      return typeof res === 'number' ? res : NaN;
    }
  }

  /* ==========================================================================
     2. NUMERICAL UTILITIES & DOMAIN SCANNER
     ========================================================================== */

  /**
   * High-accuracy central difference derivative f'(x)
   */
  function numericalDerivative(f, x, h = 1e-7) {
    const v1 = f(x + h);
    const v2 = f(x - h);
    return (v1 - v2) / (2 * h);
  }

  /**
   * Format numbers cleanly without -0.0
   */
  function cleanNum(val, threshold = 1e-11) {
    if (Math.abs(val) < threshold) return 0;
    return val;
  }

  function fmtVal(val, decimals = 6) {
    if (val === null || val === undefined || isNaN(val)) return '—';
    if (!isFinite(val)) return val > 0 ? '+∞' : '-∞';
    const c = cleanNum(val);
    if (Math.abs(c) >= 1e6 || (Math.abs(c) < 1e-4 && c !== 0)) {
      return c.toExponential(4);
    }
    return c.toFixed(decimals).replace(/\.?0+$/, (match) => {
      // keep at least 2 decimal digits unless zero
      return match.length > 4 ? '' : match;
    });
  }

  function fmtError(val) {
    if (val === null || val === undefined || isNaN(val)) return '—';
    if (!isFinite(val)) return '∞';
    const c = cleanNum(val);
    if (c === 0) return '0.0';
    if (c >= 0.001 && c < 1000) return c.toFixed(6);
    return c.toExponential(4);
  }

  function fmtRelError(val) {
    if (val === null || val === undefined || isNaN(val)) return '—';
    if (!isFinite(val)) return '∞';
    const c = cleanNum(val);
    const pct = c * 100;
    if (c === 0) return '0.0% (0.0)';
    if (pct >= 0.001 && pct < 1000) {
      return `${pct.toFixed(4)}% (${c.toFixed(6)})`;
    }
    return `${pct.toExponential(3)}% (${c.toExponential(3)})`;
  }

  /**
   * Parses tolerance text (e.g. "0.0001%", "1e-5", "0.001")
   */
  function parseTolerance(str) {
    if (!str || typeof str !== 'string') return 1e-6;
    const s = str.trim();
    if (s.endsWith('%')) {
      const num = parseFloat(s.slice(0, -1));
      return isNaN(num) || num <= 0 ? 1e-6 : num / 100;
    }
    const num = parseFloat(s);
    return isNaN(num) || num <= 0 ? 1e-6 : num;
  }

  /**
   * Automated Domain Scanner to detect root brackets via Bolzano sign-change
   */
  function findBrackets(f, xMin = -10, xMax = 10, steps = 200) {
    if (xMin >= xMax) [xMin, xMax] = [xMax, xMin];
    const dx = (xMax - xMin) / steps;
    const brackets = [];

    let prevX = null;
    let prevF = null;

    for (let i = 0; i <= steps; i++) {
      const x = xMin + i * dx;
      let val;
      try {
        val = f(x);
        if (!isFinite(val) || isNaN(val)) {
          prevX = null;
          prevF = null;
          continue;
        }
      } catch (e) {
        prevX = null;
        prevF = null;
        continue;
      }

      if (prevX !== null && prevF !== null) {
        if (Math.abs(prevF) < 1e-13) {
          brackets.push({ a: Number(prevX.toFixed(4)), b: Number(prevX.toFixed(4)), exact: true });
        } else if (prevF * val < 0) {
          brackets.push({ a: Number(prevX.toFixed(4)), b: Number(x.toFixed(4)), exact: false });
        }
      }

      prevX = x;
      prevF = val;
    }

    return brackets;
  }

  /* ==========================================================================
     3. NUMERICAL ROOT-FINDING SOLVERS
     ========================================================================== */

  /**
   * Bisection Method Solver
   */
  function solveBisection(f, a, b, tol, maxIter = 1000) {
    const rows = [];
    if (a > b) [a, b] = [b, a];

    let fa = f(a);
    let fb = f(b);

    if (a === b || Math.abs(fa) < 1e-15) {
      rows.push({
        iteration: 1,
        a, b, c: a,
        fVal: fa,
        ea: 0,
        relEa: 0,
        desc: `Initial endpoint a=${a} is already a root.`
      });
      return { root: a, iterations: 1, rows, converged: true, errorMsg: null };
    }

    if (Math.abs(fb) < 1e-15) {
      rows.push({
        iteration: 1,
        a, b, c: b,
        fVal: fb,
        ea: 0,
        relEa: 0,
        desc: `Initial endpoint b=${b} is already a root.`
      });
      return { root: b, iterations: 1, rows, converged: true, errorMsg: null };
    }

    if (fa * fb > 0) {
      return {
        root: null,
        iterations: 0,
        rows: [],
        converged: false,
        errorMsg: `Bolzano theorem violation: f(${a})=${fmtVal(fa)} and f(${b})=${fmtVal(fb)} have the SAME sign! A sign change is required.`
      };
    }

    let prevC = null;
    let currA = a;
    let currB = b;

    for (let i = 1; i <= maxIter; i++) {
      const c = (currA + currB) / 2;
      const fc = f(c);

      const ea = prevC !== null ? Math.abs(c - prevC) : null;
      const relEa = (ea !== null && Math.abs(c) > 1e-15) ? (ea / Math.abs(c)) : (ea !== null ? Infinity : null);

      let stepDesc = '';
      if (i === 1) {
        stepDesc = `Midpoint c₁ = (${fmtVal(currA)} + ${fmtVal(currB)}) / 2 = ${fmtVal(c)}, f(c₁) = ${fmtVal(fc)}`;
      } else {
        stepDesc = `Midpoint c${i} = ${fmtVal(c)}, Δx = ${fmtVal(ea)}, ε_a = ${fmtRelError(relEa)}`;
      }

      rows.push({
        iteration: i,
        a: currA,
        b: currB,
        c,
        fVal: fc,
        ea,
        relEa,
        desc: stepDesc
      });

      // Stopping condition: f(c) near 0 or relative approximate error <= tol
      if (Math.abs(fc) < 1e-15 || (relEa !== null && relEa <= tol)) {
        return { root: cleanNum(c), iterations: i, rows, converged: true, errorMsg: null };
      }

      const fCurrA = f(currA);
      if (fCurrA * fc < 0) {
        currB = c; // root is in left half
      } else {
        currA = c; // root is in right half
      }
      prevC = c;
    }

    return { root: cleanNum(rows[rows.length - 1].c), iterations: maxIter, rows, converged: false, errorMsg: "Reached maximum iterations without meeting tolerance." };
  }

  /**
   * Secant Method Solver
   */
  function solveSecant(f, x0, x1, tol, maxIter = 1000) {
    const rows = [];
    let p0 = x0;
    let p1 = x1;
    let f0 = f(p0);
    let f1 = f(p1);

    if (p0 === p1) {
      return {
        root: null,
        iterations: 0,
        rows: [],
        converged: false,
        errorMsg: "Initial guesses x₀ and x₁ must be distinct numbers."
      };
    }

    for (let i = 1; i <= maxIter; i++) {
      const denom = f1 - f0;
      if (Math.abs(denom) < 1e-15) {
        return {
          root: cleanNum(p1),
          iterations: rows.length,
          rows,
          converged: false,
          errorMsg: `Denominator f(x_${i}) - f(x_${i - 1}) near zero (nearly horizontal chord). Stopped to prevent division by zero.`
        };
      }

      // Secant formula: p2 = p1 - f1 * (p1 - p0) / (f1 - f0)
      const p2 = p1 - f1 * (p1 - p0) / denom;
      const f2 = f(p2);
      const ea = Math.abs(p2 - p1);
      const relEa = Math.abs(p2) > 1e-15 ? (ea / Math.abs(p2)) : Infinity;

      const stepDesc = `Chord between (${fmtVal(p0)}, ${fmtVal(f0)}) & (${fmtVal(p1)}, ${fmtVal(f1)}) -> x_${i + 1} = ${fmtVal(p2)}, ε_a = ${fmtRelError(relEa)}`;

      rows.push({
        iteration: i,
        p0,
        p1,
        p2,
        estimate: p2,
        f0,
        f1,
        fVal: f2,
        ea,
        relEa,
        desc: stepDesc
      });

      if (Math.abs(f2) < 1e-15 || relEa <= tol) {
        return { root: cleanNum(p2), iterations: i, rows, converged: true, errorMsg: null };
      }

      p0 = p1;
      p1 = p2;
      f0 = f1;
      f1 = f2;
    }

    return { root: cleanNum(rows[rows.length - 1].p2), iterations: maxIter, rows, converged: false, errorMsg: "Reached maximum iterations without meeting tolerance." };
  }

  /**
   * Newton-Raphson Method Solver
   */
  function solveNewton(f, x0, tol, maxIter = 1000) {
    const rows = [];
    let curr = x0;
    let prev = null;

    for (let i = 1; i <= maxIter; i++) {
      const fc = f(curr);
      const dfc = numericalDerivative(f, curr);

      const ea = prev !== null ? Math.abs(curr - prev) : null;
      const relEa = (ea !== null && Math.abs(curr) > 1e-15) ? (ea / Math.abs(curr)) : (ea !== null ? Infinity : null);

      const stepDesc = `Tangent at x_${i} = ${fmtVal(curr)}: slope f'=${fmtVal(dfc)}, f(x)=${fmtVal(fc)}, ε_a=${fmtRelError(relEa)}`;

      rows.push({
        iteration: i,
        xn: curr,
        estimate: curr,
        fVal: fc,
        dfVal: dfc,
        ea,
        relEa,
        desc: stepDesc
      });

      if (Math.abs(fc) < 1e-15 || (relEa !== null && relEa <= tol)) {
        return { root: cleanNum(curr), iterations: i, rows, converged: true, errorMsg: null };
      }

      if (Math.abs(dfc) < 1e-14) {
        return {
          root: cleanNum(curr),
          iterations: i,
          rows,
          converged: false,
          errorMsg: `Derivative f'(${fmtVal(curr)}) is near zero (horizontal tangent line). Cannot project to x-axis.`
        };
      }

      prev = curr;
      curr = curr - fc / dfc;
    }

    return { root: cleanNum(rows[rows.length - 1].xn), iterations: maxIter, rows, converged: false, errorMsg: "Reached maximum iterations without meeting tolerance." };
  }

  /**
   * Fixed-Point Iteration Solver (x_{k+1} = g(x_k))
   */
  function solveFixedPoint(g, x0, tol, maxIter = 1000, fOpt = null) {
    const rows = [];
    let curr = x0;

    for (let i = 1; i <= maxIter; i++) {
      let xNext;
      try {
        xNext = g(curr);
      } catch (err) {
        return {
          root: cleanNum(curr),
          iterations: rows.length,
          rows,
          converged: false,
          errorMsg: `Failed to evaluate g(${fmtVal(curr)}): ${err.message}`,
          isFixedPoint: true
        };
      }

      if (!isFinite(xNext) || isNaN(xNext) || Math.abs(xNext) > 1e12) {
        return {
          root: cleanNum(curr),
          iterations: rows.length,
          rows,
          converged: false,
          errorMsg: `Fixed-Point Iteration diverged at step ${i} (|x| > 10¹² or NaN). Condition |g'(x)| < 1 violated.`,
          isFixedPoint: true
        };
      }

      const ea = Math.abs(xNext - curr);
      const relEa = Math.abs(xNext) > 1e-15 ? (ea / Math.abs(xNext)) : Infinity;
      let fVal = 0;
      if (fOpt) {
        try { fVal = fOpt(xNext); } catch (e) { fVal = 0; }
      }

      const stepDesc = `Step ${i}: x_${i} = g(${fmtVal(curr)}) = ${fmtVal(xNext)}, Δx = ${fmtVal(ea)}, ε_a = ${fmtRelError(relEa)}`;

      rows.push({
        iteration: i,
        xn: curr,
        xk: curr,
        xNext: xNext,
        gx: xNext,
        estimate: xNext,
        fVal: fVal,
        ea,
        relEa,
        desc: stepDesc
      });

      if (relEa <= tol || ea < 1e-15) {
        return { root: cleanNum(xNext), iterations: i, rows, converged: true, errorMsg: null, isFixedPoint: true };
      }

      curr = xNext;
    }

    return { root: cleanNum(rows[rows.length - 1].xNext), iterations: maxIter, rows, converged: false, errorMsg: "Reached maximum iterations without meeting tolerance.", isFixedPoint: true };
  }

  /**
   * Check Strict Diagonal Dominance of square matrix A
   */
  function checkDiagonalDominance(A) {
    const n = A.length;
    let isDominant = true;
    const rowDetails = [];

    for (let i = 0; i < n; i++) {
      const diag = Math.abs(A[i][i]);
      let sumOff = 0;
      for (let j = 0; j < n; j++) {
        if (j !== i) sumOff += Math.abs(A[i][j]);
      }
      const ok = diag > sumOff;
      if (!ok) isDominant = false;
      rowDetails.push({ row: i + 1, diag, sumOff, ok });
    }

    return { isDominant, rowDetails };
  }

  /**
   * Jacobi Method Solver for Linear Systems Ax = b
   */
  function solveJacobi(A, b, x0, tol, maxIter = 1000) {
    const n = b.length;
    const rows = [];
    let xCurr = [...x0];

    for (let i = 0; i < n; i++) {
      if (Math.abs(A[i][i]) < 1e-14) {
        return {
          root: null,
          solutionVector: xCurr,
          iterations: 0,
          rows: [],
          converged: false,
          errorMsg: `Diagonal element A[${i+1},${i+1}] is zero. Cannot divide by zero in Jacobi method. Try auto-pivoting.`,
          isLinearSystem: true
        };
      }
    }

    const { isDominant } = checkDiagonalDominance(A);

    for (let k = 1; k <= maxIter; k++) {
      const xNext = new Array(n);
      const compDetails = [];

      for (let i = 0; i < n; i++) {
        let sumOff = 0;
        for (let j = 0; j < n; j++) {
          if (j !== i) sumOff += A[i][j] * xCurr[j];
        }
        xNext[i] = (b[i] - sumOff) / A[i][i];
        compDetails.push(`x${i+1} = (${fmtVal(b[i])} - ${fmtVal(sumOff)}) / ${fmtVal(A[i][i])} = ${fmtVal(xNext[i])}`);
      }

      const diffs = xNext.map((val, idx) => Math.abs(val - xCurr[idx]));
      const relErrors = xNext.map((val, idx) => Math.abs(val) > 1e-15 ? diffs[idx] / Math.abs(val) : Infinity);
      const maxEa = Math.max(...diffs);
      const maxRelEa = Math.max(...relErrors);

      let resNormSq = 0;
      for (let i = 0; i < n; i++) {
        let ax_i = 0;
        for (let j = 0; j < n; j++) ax_i += A[i][j] * xNext[j];
        resNormSq += (ax_i - b[i]) * (ax_i - b[i]);
      }
      const residualNorm = Math.sqrt(resNormSq);

      const stepDesc = `Iter ${k}: x = [${xNext.map(v => fmtVal(v, 4)).join(', ')}], ε_a,max = ${fmtRelError(maxRelEa)}`;

      rows.push({
        iteration: k,
        x: [...xNext],
        prevX: [...xCurr],
        xPrev: [...xCurr],
        estimate: xNext[0],
        fVal: residualNorm,
        ea: maxEa,
        relEa: maxRelEa,
        compDetails,
        desc: stepDesc
      });

      if (!isFinite(maxRelEa) || maxEa > 1e12) {
        return {
          root: cleanNum(xNext[0]),
          solutionVector: xNext.map(cleanNum),
          iterations: k,
          rows,
          converged: false,
          errorMsg: "Jacobi iteration diverged. Matrix is likely not diagonally dominant.",
          isLinearSystem: true,
          diagonallyDominant: isDominant,
          residualNorm
        };
      }

      if (maxRelEa <= tol || maxEa < 1e-15) {
        return {
          root: cleanNum(xNext[0]),
          solutionVector: xNext.map(cleanNum),
          iterations: k,
          rows,
          converged: true,
          errorMsg: null,
          isLinearSystem: true,
          diagonallyDominant: isDominant,
          residualNorm
        };
      }

      xCurr = [...xNext];
    }

    return {
      root: cleanNum(rows[rows.length - 1].x[0]),
      solutionVector: rows[rows.length - 1].x.map(cleanNum),
      iterations: maxIter,
      rows,
      converged: false,
      errorMsg: "Reached maximum iterations without meeting tolerance.",
      isLinearSystem: true,
      diagonallyDominant: isDominant,
      residualNorm: rows[rows.length - 1].fVal
    };
  }

  /**
   * Gauss-Seidel Method Solver for Linear Systems Ax = b
   */
  function solveGaussSeidel(A, b, x0, tol, maxIter = 1000) {
    const n = b.length;
    const rows = [];
    let xCurr = [...x0];

    for (let i = 0; i < n; i++) {
      if (Math.abs(A[i][i]) < 1e-14) {
        return {
          root: null,
          solutionVector: xCurr,
          iterations: 0,
          rows: [],
          converged: false,
          errorMsg: `Diagonal element A[${i+1},${i+1}] is zero. Cannot divide by zero in Gauss-Seidel method. Try auto-pivoting.`,
          isLinearSystem: true
        };
      }
    }

    const { isDominant } = checkDiagonalDominance(A);

    for (let k = 1; k <= maxIter; k++) {
      const xPrevStep = [...xCurr];
      const xNext = [...xCurr];
      const compDetails = [];

      for (let i = 0; i < n; i++) {
        let sumOther = 0;
        for (let j = 0; j < n; j++) {
          if (j !== i) sumOther += A[i][j] * xNext[j];
        }
        xNext[i] = (b[i] - sumOther) / A[i][i];
        compDetails.push(`x${i+1} = (${fmtVal(b[i])} - ${fmtVal(sumOther)}) / ${fmtVal(A[i][i])} = ${fmtVal(xNext[i])}`);
      }

      const diffs = xNext.map((val, idx) => Math.abs(val - xPrevStep[idx]));
      const relErrors = xNext.map((val, idx) => Math.abs(val) > 1e-15 ? diffs[idx] / Math.abs(val) : Infinity);
      const maxEa = Math.max(...diffs);
      const maxRelEa = Math.max(...relErrors);

      let resNormSq = 0;
      for (let i = 0; i < n; i++) {
        let ax_i = 0;
        for (let j = 0; j < n; j++) ax_i += A[i][j] * xNext[j];
        resNormSq += (ax_i - b[i]) * (ax_i - b[i]);
      }
      const residualNorm = Math.sqrt(resNormSq);

      const stepDesc = `Iter ${k}: x = [${xNext.map(v => fmtVal(v, 4)).join(', ')}], ε_a,max = ${fmtRelError(maxRelEa)}`;

      rows.push({
        iteration: k,
        x: [...xNext],
        prevX: [...xPrevStep],
        xPrev: [...xPrevStep],
        estimate: xNext[0],
        fVal: residualNorm,
        ea: maxEa,
        relEa: maxRelEa,
        compDetails,
        desc: stepDesc
      });

      if (!isFinite(maxRelEa) || maxEa > 1e12) {
        return {
          root: cleanNum(xNext[0]),
          solutionVector: xNext.map(cleanNum),
          iterations: k,
          rows,
          converged: false,
          errorMsg: "Gauss-Seidel iteration diverged. Matrix is likely not diagonally dominant.",
          isLinearSystem: true,
          diagonallyDominant: isDominant,
          residualNorm
        };
      }

      if (maxRelEa <= tol || maxEa < 1e-15) {
        return {
          root: cleanNum(xNext[0]),
          solutionVector: xNext.map(cleanNum),
          iterations: k,
          rows,
          converged: true,
          errorMsg: null,
          isLinearSystem: true,
          diagonallyDominant: isDominant,
          residualNorm
        };
      }

      xCurr = [...xNext];
    }

    return {
      root: cleanNum(rows[rows.length - 1].x[0]),
      solutionVector: rows[rows.length - 1].x.map(cleanNum),
      iterations: maxIter,
      rows,
      converged: false,
      errorMsg: "Reached maximum iterations without meeting tolerance.",
      isLinearSystem: true,
      diagonallyDominant: isDominant,
      residualNorm: rows[rows.length - 1].fVal
    };
  }

  function autoPivotMatrix(A, b) {
    const n = A.length;
    const newA = A.map(row => [...row]);
    const newB = [...b];

    for (let col = 0; col < n; col++) {
      let maxVal = Math.abs(newA[col][col]);
      let bestRow = col;
      for (let r = col + 1; r < n; r++) {
        if (Math.abs(newA[r][col]) > maxVal) {
          maxVal = Math.abs(newA[r][col]);
          bestRow = r;
        }
      }
      if (bestRow !== col) {
        [newA[col], newA[bestRow]] = [newA[bestRow], newA[col]];
        [newB[col], newB[bestRow]] = [newB[bestRow], newB[col]];
      }
    }
    return { A: newA, b: newB };
  }

  /* ==========================================================================
     4. APPLICATION STATE & DOM REFERENCES
     ========================================================================== */

  const state = {
    method: 'bisection',
    exprString: 'x^3 - 7x + 1',
    f: null,
    compiledExpr: null,
    tol: 1e-6,
    maxIter: 100,
    trueRoot: null,
    inputs: {
      bisA: 0,
      bisB: 1,
      secX0: 0,
      secX1: 1,
      newtonX0: 0.5
    },
    linearSystem: {
      dim: 3,
      A: [
        [4, -1, 1],
        [4, -8, 1],
        [-2, 1, 5]
      ],
      b: [7, -21, 15],
      x0: [0, 0, 0]
    },
    fixedPoint: {
      gxString: '(x^3 + 1) / 7',
      g: null,
      x0: 0.5
    },
    currentResult: null,
    shootoutResults: null,
    // Step-by-step playback state
    playback: {
      currentStep: 1,
      isPlaying: false,
      timer: null,
      speed: 600
    },
    // Interactive step animation state
    stepAnimation: {
      enabled: true,
      active: false,
      t: 1.0,
      fromStep: 1,
      toStep: 1,
      startTime: 0,
      duration: 450,
      reqId: null
    },
    // Automatic Graph Zooming (smooth camera auto-focus on active step)
    autoZoom: {
      enabled: true
    },
    // Viewport transform for geometric canvas (drag & zoom)
    view: {
      tool: 'pan', // 'pan' | 'select-zoom'
      xMin: -1,
      xMax: 2,
      yMin: -6,
      yMax: 4,
      isDragging: false,
      dragStartX: 0,
      dragStartY: 0,
      origXMin: -1,
      origXMax: 2,
      origYMin: -6,
      origYMax: 4,
      zoomAnimId: null
    },
    // Marquee / Box Selection state for Select Zoom
    selection: {
      active: false,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0
    }
  };

  // DOM Elements
  const el = {
    form: document.getElementById('solver-form'),
    methodTabs: document.querySelectorAll('.method-tab'),
    inputFunc: document.getElementById('input-func'),
    funcPreview: document.getElementById('func-preview'),
    btnScanRoots: document.getElementById('btn-scan-roots'),
    funcInputGroup: document.getElementById('func-input-group'),
    inputsBisection: document.getElementById('inputs-bisection'),
    inputsSecant: document.getElementById('inputs-secant'),
    inputsNewton: document.getElementById('inputs-newton'),
    inputsFixedPoint: document.getElementById('inputs-fixedpoint'),
    inputFixedGx: document.getElementById('input-fixed-gx'),
    fixedGxPreview: document.getElementById('fixed-gx-preview'),
    inputFixedX0: document.getElementById('input-fixed-x0'),
    inputsLinearSystem: document.getElementById('inputs-linear-system'),
    matrixEditor: document.getElementById('matrix-editor'),
    initialGuessVector: document.getElementById('initial-guess-vector'),
    diagonalDominanceBadge: document.getElementById('diagonal-dominance-badge'),
    btnAutoPivot: document.getElementById('btn-auto-pivot'),
    dimPills: document.querySelectorAll('.dim-pill'),
    tabShootoutTitle: document.getElementById('tab-shootout-title'),
    shootoutHeading: document.getElementById('shootout-heading'),
    shootoutSubtext: document.getElementById('shootout-subtext'),
    inputBisA: document.getElementById('input-bis-a'),
    inputBisB: document.getElementById('input-bis-b'),
    bolzanoBadge: document.getElementById('bolzano-check-badge'),
    inputSecX0: document.getElementById('input-sec-x0'),
    inputSecX1: document.getElementById('input-sec-x1'),
    inputNewtonX0: document.getElementById('input-newton-x0'),
    inputTol: document.getElementById('input-tol'),
    inputMaxIter: document.getElementById('input-max-iter'),
    inputTrueRoot: document.getElementById('input-true-root'),
    solverAlert: document.getElementById('solver-alert'),
    btnCalculate: document.getElementById('btn-calculate'),
    btnCompareAll: document.getElementById('btn-compare-all'),
    presetSelect: document.getElementById('preset-select'),
    // Scanner
    scannerCard: document.getElementById('scanner-results-card'),
    scannerSummaryText: document.getElementById('scanner-summary-text'),
    bracketPillsList: document.getElementById('bracket-pills-list'),
    btnCloseScanner: document.getElementById('btn-close-scanner'),
    // Metrics
    metricRoot: document.getElementById('metric-root'),
    metricFVal: document.getElementById('metric-f-val'),
    metricIters: document.getElementById('metric-iters'),
    metricMethodName: document.getElementById('metric-method-name'),
    metricRelEa: document.getElementById('metric-rel-ea'),
    metricAbsEa: document.getElementById('metric-abs-ea'),
    metricExactErr: document.getElementById('metric-exact-err'),
    metricExactRel: document.getElementById('metric-exact-rel'),
    // Workspace tabs
    viewTabs: document.querySelectorAll('.nav-tab'),
    viewPanels: {
      vis: document.getElementById('view-vis'),
      table: document.getElementById('view-table'),
      shootout: document.getElementById('view-shootout')
    },
    tableActionsToolbar: document.getElementById('table-actions-toolbar'),
    tableRowCount: document.getElementById('table-row-count'),
    // Playback
    btnStepFirst: document.getElementById('btn-step-first'),
    btnStepPrev: document.getElementById('btn-step-prev'),
    btnPlayPause: document.getElementById('btn-play-pause'),
    iconPlay: document.getElementById('icon-play'),
    iconPause: document.getElementById('icon-pause'),
    btnStepNext: document.getElementById('btn-step-next'),
    btnStepLast: document.getElementById('btn-step-last'),
    stepSlider: document.getElementById('step-slider'),
    stepBadge: document.getElementById('step-badge'),
    playbackSpeed: document.getElementById('playback-speed'),
    toggleAnimSteps: document.getElementById('toggle-anim-steps'),
    toggleAutoZoom: document.getElementById('toggle-auto-zoom'),
    btnResetView: document.getElementById('btn-reset-view'),
    btnSpanScreen: document.getElementById('btn-span-screen'),
    iconSpanExpand: document.getElementById('icon-span-expand'),
    iconSpanCollapse: document.getElementById('icon-span-collapse'),
    appLayout: document.querySelector('.app-layout'),
    // Fullscreen Graph Controls
    geomCanvasPanel: document.getElementById('geom-canvas-panel'),
    btnGeomFullscreen: document.getElementById('btn-geom-fullscreen'),
    iconEnterFullscreen: document.getElementById('icon-enter-fullscreen'),
    iconExitFullscreen: document.getElementById('icon-exit-fullscreen'),
    fullscreenHud: document.getElementById('fullscreen-hud'),
    fsBtnStepFirst: document.getElementById('fs-btn-step-first'),
    fsBtnStepPrev: document.getElementById('fs-btn-step-prev'),
    fsBtnPlayPause: document.getElementById('fs-btn-play-pause'),
    fsIconPlay: document.getElementById('fs-icon-play'),
    fsIconPause: document.getElementById('fs-icon-pause'),
    fsBtnStepNext: document.getElementById('fs-btn-step-next'),
    fsBtnStepLast: document.getElementById('fs-btn-step-last'),
    fsStepSlider: document.getElementById('fs-step-slider'),
    fsStepBadge: document.getElementById('fs-step-badge'),
    fsPlaybackSpeed: document.getElementById('fs-playback-speed'),
    fsToggleAnimSteps: document.getElementById('fs-toggle-anim-steps'),
    fsToggleAutoZoom: document.getElementById('fs-toggle-auto-zoom'),
    btnFsExit: document.getElementById('btn-fs-exit'),
    // Canvas Toolbar & Tools
    toolPan: document.getElementById('tool-pan'),
    toolSelectZoom: document.getElementById('tool-select-zoom'),
    toolAutoZoom: document.getElementById('tool-auto-zoom'),
    btnZoomIn: document.getElementById('btn-zoom-in'),
    btnZoomOut: document.getElementById('btn-zoom-out'),
    canvasSelectionBox: document.getElementById('canvas-selection-box'),
    canvasSelectionLabel: document.getElementById('canvas-selection-label'),
    canvasHint: document.getElementById('canvas-hint'),
    // Canvases
    geomCanvas: document.getElementById('geom-canvas'),
    geomCanvasWrapper: document.getElementById('geom-canvas-wrapper'),
    errorCanvas: document.getElementById('error-canvas'),
    shootoutCanvas: document.getElementById('shootout-canvas'),
    canvasTooltip: document.getElementById('canvas-tooltip'),
    geomStepLabel: document.getElementById('geom-step-label'),
    geomLegend: document.getElementById('geom-legend'),
    stepDetailBox: document.getElementById('step-detail-box'),
    stepNumberTag: document.getElementById('step-number-tag'),
    stepActionDesc: document.getElementById('step-action-desc'),
    stepDetailMath: document.getElementById('step-detail-math'),
    // Tables
    iterationTableHead: document.getElementById('iteration-table-head'),
    iterationTableBody: document.getElementById('iteration-table-body'),
    shootoutTableBody: document.getElementById('shootout-table-body'),
    btnCopyTable: document.getElementById('btn-copy-table'),
    btnExportCsv: document.getElementById('btn-export-csv'),
    // Theory Modal
    theoryDialog: document.getElementById('theory-dialog'),
    btnOpenTheory: document.getElementById('btn-open-theory'),
    btnCloseTheory: document.getElementById('btn-close-theory'),
    btnTheoryDone: document.getElementById('btn-theory-done'),
    theoryTabs: document.querySelectorAll('.theory-tab-btn'),
    theoryContents: document.querySelectorAll('.theory-content'),
    // Theme toggle buttons
    themeButtons: document.querySelectorAll('.theme-btn')
  };

  /* ==========================================================================
     5. THEME SWITCHER CONTROLLER (Modern Web Guidance)
     ========================================================================== */

  function initTheme() {
    const meta = document.querySelector('meta[name="color-scheme"]');
    const stored = localStorage.getItem("theme-preference") || "system";

    function applyTheme(pref) {
      if (pref === "dark") {
        if (meta) meta.content = "dark";
        document.documentElement.setAttribute('data-theme', 'dark');
      } else if (pref === "light") {
        if (meta) meta.content = "light";
        document.documentElement.setAttribute('data-theme', 'light');
      } else {
        if (meta) meta.content = "light dark";
        document.documentElement.setAttribute('data-theme', 'system');
      }

      el.themeButtons.forEach(btn => {
        const val = btn.dataset.themeVal;
        btn.classList.toggle('active', val === pref);
      });

      // Redraw canvases on theme switch to ensure crisp contrast
      renderCanvases();
    }

    el.themeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const pref = btn.dataset.themeVal;
        if (pref === "system") {
          localStorage.removeItem("theme-preference");
        } else {
          localStorage.setItem("theme-preference", pref);
        }
        applyTheme(pref);
      });
    });

    window.addEventListener('storage', (e) => {
      if (e.key === "theme-preference") {
        applyTheme(e.newValue || "system");
      }
    });

    applyTheme(stored);
  }

  /* ==========================================================================
     6. CANVAS RENDERING ENGINE (High-DPI 2-Panel & Shootout)
     ========================================================================== */

  function getThemeColors() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark' ||
      window.matchMedia('(prefers-color-scheme: dark)').matches;

    return {
      isDark,
      bg: isDark ? '#111827' : '#ffffff',
      grid: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.07)',
      border: isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(0, 0, 0, 0.14)',
      axis: isDark ? '#64748b' : '#94a3b8',
      text: isDark ? '#94a3b8' : '#64748b',
      textMuted: isDark ? '#94a3b8' : '#64748b',
      textMain: isDark ? '#f8fafc' : '#0f172a',
      curve: isDark ? '#38bdf8' : '#0284c7',
      primary: isDark ? '#3b82f6' : '#2563eb',
      accent: isDark ? '#a855f7' : '#7c3aed',
      danger: isDark ? '#f87171' : '#dc2626',
      success: isDark ? '#4ade80' : '#16a34a',
      warning: isDark ? '#fbbf24' : '#d97706',
      bracketFill: isDark ? 'rgba(56, 189, 248, 0.15)' : 'rgba(2, 132, 199, 0.12)'
    };
  }

  function calculateNiceTicks(min, max, maxTicks = 8) {
    const span = max - min;
    if (!isFinite(span) || span <= 0) return { step: 1, ticks: [min, max] };
    const rawStep = span / maxTicks;
    const power = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const fraction = rawStep / power;
    let factor = 1;
    if (fraction > 5) factor = 10;
    else if (fraction > 2) factor = 5;
    else if (fraction > 1) factor = 2;
    const step = factor * power;

    const first = Math.ceil(min / step) * step;
    const ticks = [];
    for (let x = first; x <= max + step * 0.001; x += step) {
      ticks.push(x);
      if (ticks.length > 35 || x + step <= x) break;
    }
    return { step, ticks };
  }

  function formatTickLabel(val, step) {
    if (Math.abs(val) < 1e-15) return '0';
    const absVal = Math.abs(val);
    const absStep = Math.abs(step);

    if (absVal < 1e-4 || absVal > 1e6) {
      const expDecimals = Math.max(1, Math.min(8, Math.ceil(-Math.log10(absStep / absVal))));
      return val.toExponential(expDecimals);
    }
    const decimals = Math.max(0, Math.min(10, Math.ceil(-Math.log10(absStep))));
    return val.toFixed(decimals);
  }

  function fmtAdaptive(val, span) {
    if (!isFinite(val)) return '—';
    const absSpan = Math.abs(span || 1);
    const decimals = Math.max(4, Math.min(10, Math.ceil(-Math.log10(absSpan)) + 3));
    return cleanNum(val, 1e-12).toFixed(decimals);
  }

  function drawCanvasPillText(ctx, text, x, y, options = {}) {
    ctx.save();
    ctx.font = options.font || '600 10px monospace';
    const paddingX = options.padX !== undefined ? options.padX : 4;
    const paddingY = options.padY !== undefined ? options.padY : 2;
    const metrics = ctx.measureText(text);
    const textW = metrics.width;
    const textH = options.fontSize || 10;

    let rx = x;
    if (options.align === 'center') rx = x - textW / 2;
    else if (options.align === 'right') rx = x - textW;

    const ry = y - textH + 1;

    ctx.fillStyle = options.bg || 'rgba(15, 23, 42, 0.78)';
    ctx.beginPath();
    const r = options.radius !== undefined ? options.radius : 3;
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(rx - paddingX, ry - paddingY, textW + paddingX * 2, textH + paddingY * 2, r);
    } else {
      ctx.rect(rx - paddingX, ry - paddingY, textW + paddingX * 2, textH + paddingY * 2);
    }
    ctx.fill();

    if (options.border) {
      ctx.strokeStyle = options.border;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.fillStyle = options.color || '#f8fafc';
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    ctx.fillText(text, rx, y);
    ctx.restore();
  }

  function resizeCanvas(canvas) {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== Math.floor(rect.width * dpr) || canvas.height !== Math.floor(rect.height * dpr)) {
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
    }
    const ctx = canvas.getContext('2d');
    ctx.resetTransform();
    ctx.scale(dpr, dpr);
    return { width: rect.width, height: rect.height, ctx };
  }

  /**
   * Panel 1: Geometric Visualizer (Curve f(x), brackets, chord lines, tangents)
   */
  function renderGeomCanvas() {
    const canvas = el.geomCanvas;
    if (!canvas) return;
    const { width, height, ctx } = resizeCanvas(canvas);
    const colors = getThemeColors();

    ctx.clearRect(0, 0, width, height);

    // If solving Linear Systems (Jacobi or Gauss-Seidel), delegate immediately
    // so no 1D root-finding grid is ever drawn underneath!
    if (state.method === 'jacobi' || state.method === 'gaussseidel') {
      renderLinearSystemVisualizer(ctx, width, height, colors);
      return;
    }

    // Coordinate conversion utilities
    const { xMin, xMax, yMin, yMax } = state.view;
    const toScreenX = (x) => ((x - xMin) / (xMax - xMin)) * width;
    const toScreenY = (y) => height - ((y - yMin) / (yMax - yMin)) * height;
    const fromScreenX = (sx) => xMin + (sx / width) * (xMax - xMin);
    const fromScreenY = (sy) => yMin + ((height - sy) / height) * (yMax - yMin);

    // 1. Draw Adaptive Grid Lines and High-Legibility Ticks
    ctx.lineWidth = 1;
    ctx.strokeStyle = colors.grid;

    const xSpan = Math.max(xMax - xMin, 1e-15);
    const ySpan = Math.max(yMax - yMin, 1e-15);

    const xTicks = calculateNiceTicks(xMin, xMax, Math.max(4, Math.floor(width / 95)));
    const yTicks = calculateNiceTicks(yMin, yMax, Math.max(3, Math.floor(height / 70)));

    // Vertical grid & X-axis ticks
    xTicks.ticks.forEach(x => {
      const sx = toScreenX(x);
      if (sx < 0 || sx > width) return;
      ctx.beginPath();
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, height);
      ctx.stroke();

      // Tick label with backdrop pill for maximum readability
      const syZero = Math.min(Math.max(toScreenY(0) + 14, 16), height - 8);
      const label = formatTickLabel(x, xTicks.step);
      drawCanvasPillText(ctx, label, sx, syZero, {
        align: 'center',
        font: '600 10px monospace',
        bg: colors.isDark ? 'rgba(15, 23, 42, 0.78)' : 'rgba(255, 255, 255, 0.88)',
        color: colors.text,
        padX: 3,
        padY: 2,
        radius: 3
      });
    });

    // Horizontal grid & Y-axis ticks
    yTicks.ticks.forEach(y => {
      const sy = toScreenY(y);
      if (sy < 0 || sy > height) return;
      ctx.beginPath();
      ctx.moveTo(0, sy);
      ctx.lineTo(width, sy);
      ctx.stroke();

      if (Math.abs(y) > yTicks.step * 0.1) {
        const sxZero = Math.min(Math.max(toScreenX(0) + 6, 6), width - 45);
        const label = formatTickLabel(y, yTicks.step);
        drawCanvasPillText(ctx, label, sxZero, sy + 3, {
          align: 'left',
          font: '600 10px monospace',
          bg: colors.isDark ? 'rgba(15, 23, 42, 0.78)' : 'rgba(255, 255, 255, 0.88)',
          color: colors.text,
          padX: 3,
          padY: 2,
          radius: 3
        });
      }
    });

    // 2. Axes (X=0 and Y=0)
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = colors.axis;

    const zeroY = toScreenY(0);
    if (zeroY >= 0 && zeroY <= height) {
      ctx.beginPath();
      ctx.moveTo(0, zeroY);
      ctx.lineTo(width, zeroY);
      ctx.stroke();
    }

    const zeroX = toScreenX(0);
    if (zeroX >= 0 && zeroX <= width) {
      ctx.beginPath();
      ctx.moveTo(zeroX, 0);
      ctx.lineTo(zeroX, height);
      ctx.stroke();
    }

    // 3. Draw Function Curve or Line Models
    if (state.method === 'fixedpoint') {
      // Draw identity line y = x in dashed warning color
      ctx.strokeStyle = colors.warning;
      ctx.lineWidth = 1.6;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(toScreenX(xMin), toScreenY(xMin));
      ctx.lineTo(toScreenX(xMax), toScreenY(xMax));
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw iteration curve y = g(x)
      if (state.fixedPoint && state.fixedPoint.g) {
        ctx.lineWidth = 2.2;
        ctx.strokeStyle = colors.curve;
        ctx.beginPath();

        const numSamples = Math.min(width * 2, 1000);
        let started = false;

        for (let i = 0; i <= numSamples; i++) {
          const sx = (i / numSamples) * width;
          const x = fromScreenX(sx);
          let y;
          try {
            y = state.fixedPoint.g(x);
          } catch (e) {
            started = false;
            continue;
          }

          if (!isFinite(y) || isNaN(y) || y < yMin - ySpan * 2 || y > yMax + ySpan * 2) {
            started = false;
            continue;
          }

          const sy = toScreenY(y);
          if (!started) {
            ctx.moveTo(sx, sy);
            started = true;
          } else {
            ctx.lineTo(sx, sy);
          }
        }
        ctx.stroke();
      }
    } else if (state.f) {
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = colors.curve;
      ctx.beginPath();

      const numSamples = Math.min(width * 2, 1000);
      let started = false;

      for (let i = 0; i <= numSamples; i++) {
        const sx = (i / numSamples) * width;
        const x = fromScreenX(sx);
        let y;
        try {
          y = state.f(x);
        } catch (e) {
          started = false;
          continue;
        }

        if (!isFinite(y) || isNaN(y) || y < yMin - ySpan * 2 || y > yMax + ySpan * 2) {
          started = false;
          continue;
        }

        const sy = toScreenY(y);
        if (!started) {
          ctx.moveTo(sx, sy);
          started = true;
        } else {
          ctx.lineTo(sx, sy);
        }
      }
      ctx.stroke();
    }

    // 4. Method Specific Geometric Constructions
    const result = state.currentResult;
    if (result && result.rows.length > 0) {
      const stepIdx = Math.min(state.playback.currentStep - 1, result.rows.length - 1);
      const row = result.rows[stepIdx];
      const prevRow = stepIdx > 0 ? result.rows[stepIdx - 1] : null;
      const animT = state.stepAnimation.t;

      if (state.method === 'bisection') {
        renderBisectionConstruction(ctx, row, prevRow, toScreenX, toScreenY, colors, height, animT);
      } else if (state.method === 'secant') {
        renderSecantConstruction(ctx, row, toScreenX, toScreenY, colors, animT);
      } else if (state.method === 'newton') {
        renderNewtonConstruction(ctx, row, toScreenX, toScreenY, colors, animT);
      } else if (state.method === 'fixedpoint') {
        renderFixedPointConstruction(ctx, row, toScreenX, toScreenY, colors, animT);
      }

      // 5. Draw all previous approximations as small dots on x-axis
      ctx.fillStyle = colors.accent;
      for (let i = 0; i <= stepIdx; i++) {
        const r = result.rows[i];
        const est = r.c !== undefined ? r.c : (r.p2 !== undefined ? r.p2 : (r.xNext !== undefined ? r.xNext : r.xn));
        const estX = toScreenX(est);
        const estY = toScreenY(0);

        ctx.beginPath();
        ctx.arc(estX, estY, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 6. Draw Known True Root marker if provided
    if (state.trueRoot !== null && isFinite(state.trueRoot)) {
      const rx = toScreenX(state.trueRoot);
      const ry = toScreenY(0);
      ctx.fillStyle = colors.success;
      ctx.beginPath();
      ctx.arc(rx, ry, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = colors.bg;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      drawCanvasPillText(ctx, `True Root: ${fmtAdaptive(state.trueRoot, xSpan)}`, rx + 8, ry - 8, {
        font: '600 10px monospace',
        bg: colors.isDark ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.92)',
        border: colors.success,
        color: colors.success,
        padX: 5,
        padY: 2,
        radius: 3
      });
    }

    // 7. Zoom Level & Viewport Info HUD (Top Right)
    const origSpan = (state.view.origXMax && state.view.origXMin)
      ? Math.max(state.view.origXMax - state.view.origXMin, 1e-6)
      : Math.max(xSpan, 1);
    const zoomFactor = Math.max(1, origSpan / Math.max(xSpan, 1e-15));

    let zoomText = '1.0×';
    if (zoomFactor >= 1e6) {
      zoomText = `${(zoomFactor / 1e6).toFixed(1)}M×`;
    } else if (zoomFactor >= 1000) {
      zoomText = `${(zoomFactor / 1000).toFixed(1)}k×`;
    } else if (zoomFactor > 1.1) {
      zoomText = `${Math.round(zoomFactor)}×`;
    }

    const spanText = xSpan < 0.001 ? xSpan.toExponential(2) : xSpan.toFixed(xSpan < 1 ? 4 : 2);
    const hudText = state.autoZoom.enabled
      ? `🔍 Auto-Zoom: ${zoomText} • Δx = ${spanText}`
      : `🔍 View: ${zoomText} • Δx = ${spanText}`;

    drawCanvasPillText(ctx, hudText, width - 14, 22, {
      align: 'right',
      fontSize: 10,
      font: '600 11px monospace',
      bg: colors.isDark ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.92)',
      border: state.autoZoom.enabled ? colors.primary : colors.border,
      color: state.autoZoom.enabled ? colors.primary : colors.textMuted,
      padX: 8,
      padY: 4,
      radius: 12
    });
  }

  function renderBisectionConstruction(ctx, row, prevRow, toScreenX, toScreenY, colors, height, animT = 1.0) {
    const { a, b, c, fVal } = row;
    const sZero = toScreenY(0);
    const xSpanNow = Math.max(state.view.xMax - state.view.xMin, 1e-15);

    // If animating and we have a previous row, interpolate the bracket boundaries
    let curA = a;
    let curB = b;
    if (animT < 1.0 && prevRow) {
      curA = prevRow.a + (a - prevRow.a) * animT;
      curB = prevRow.b + (b - prevRow.b) * animT;

      // Discarded half fading out
      if (a > prevRow.a) {
        const discA = toScreenX(prevRow.a);
        const discB = toScreenX(a);
        ctx.fillStyle = `rgba(239, 68, 68, ${0.18 * (1 - animT)})`;
        ctx.fillRect(Math.min(discA, discB), 0, Math.abs(discB - discA), height);
      } else if (b < prevRow.b) {
        const discA = toScreenX(b);
        const discB = toScreenX(prevRow.b);
        ctx.fillStyle = `rgba(239, 68, 68, ${0.18 * (1 - animT)})`;
        ctx.fillRect(Math.min(discA, discB), 0, Math.abs(discB - discA), height);
      }
    }

    const sa = toScreenX(curA);
    const sb = toScreenX(curB);
    const sc = toScreenX(c);

    // Shaded bracket region
    ctx.fillStyle = colors.bracketFill;
    ctx.fillRect(Math.min(sa, sb), 0, Math.abs(sb - sa), height);

    // Endpoint A
    ctx.strokeStyle = colors.danger;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.setLineDash([3, 3]);
    ctx.moveTo(sa, sZero);
    try {
      const fa = state.f(curA);
      ctx.lineTo(sa, toScreenY(fa));
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = colors.danger;
      ctx.beginPath();
      ctx.arc(sa, toScreenY(fa), 5, 0, Math.PI * 2);
      ctx.fill();
    } catch (e) {
      ctx.setLineDash([]);
    }

    // Endpoint B
    ctx.strokeStyle = colors.success;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.setLineDash([3, 3]);
    ctx.moveTo(sb, sZero);
    try {
      const fb = state.f(curB);
      ctx.lineTo(sb, toScreenY(fb));
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = colors.success;
      ctx.beginPath();
      ctx.arc(sb, toScreenY(fb), 5, 0, Math.PI * 2);
      ctx.fill();
    } catch (e) {
      ctx.setLineDash([]);
    }

    // Midpoint drop animation
    const fcY = toScreenY(fVal);
    const curScY = animT < 1.0 ? fcY + (sZero - fcY) * animT : sZero;

    ctx.strokeStyle = colors.primary;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.setLineDash([4, 2]);
    ctx.moveTo(sc, sZero);
    ctx.lineTo(sc, fcY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Curve point (c, f(c))
    ctx.fillStyle = colors.primary;
    ctx.beginPath();
    ctx.arc(sc, fcY, 5, 0, Math.PI * 2);
    ctx.fill();

    // Midpoint marker dropping to axis
    ctx.beginPath();
    ctx.arc(sc, curScY, 6, 0, Math.PI * 2);
    ctx.fill();

    // Ripple expansion ring when landing
    if (animT > 0.5 && animT < 1.0) {
      const rippleFrac = (animT - 0.5) / 0.5;
      ctx.strokeStyle = colors.primary;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(sc, sZero, 6 + rippleFrac * 18, 0, Math.PI * 2);
      ctx.stroke();
    }

    // High-readability callout pills
    drawCanvasPillText(ctx, `c = ${fmtAdaptive(c, xSpanNow)}`, sc + 6, sZero - 10, {
      font: 'bold 11px sans-serif',
      bg: colors.isDark ? 'rgba(15, 23, 42, 0.88)' : 'rgba(255, 255, 255, 0.94)',
      border: colors.primary,
      color: colors.primary,
      padX: 5,
      padY: 2,
      radius: 4
    });

    drawCanvasPillText(ctx, `a = ${fmtAdaptive(curA, xSpanNow)}`, sa - 4, sZero + 16, {
      align: 'right',
      font: '600 10px monospace',
      bg: colors.isDark ? 'rgba(15, 23, 42, 0.88)' : 'rgba(255, 255, 255, 0.94)',
      border: colors.danger,
      color: colors.danger,
      padX: 4,
      padY: 1,
      radius: 3
    });

    drawCanvasPillText(ctx, `b = ${fmtAdaptive(curB, xSpanNow)}`, sb + 4, sZero + 16, {
      align: 'left',
      font: '600 10px monospace',
      bg: colors.isDark ? 'rgba(15, 23, 42, 0.88)' : 'rgba(255, 255, 255, 0.94)',
      border: colors.success,
      color: colors.success,
      padX: 4,
      padY: 1,
      radius: 3
    });
  }

  function renderSecantConstruction(ctx, row, toScreenX, toScreenY, colors, animT = 1.0) {
    const { p0, p1, p2, f0, f1 } = row;
    const s0x = toScreenX(p0);
    const s0y = toScreenY(f0);
    const s1x = toScreenX(p1);
    const s1y = toScreenY(f1);
    const s2x = toScreenX(p2);
    const s2y = toScreenY(0);
    const xSpanNow = Math.max(state.view.xMax - state.view.xMin, 1e-15);

    // Points on curve
    ctx.fillStyle = colors.warning;
    ctx.beginPath();
    ctx.arc(s0x, s0y, 5, 0, Math.PI * 2);
    ctx.arc(s1x, s1y, 5, 0, Math.PI * 2);
    ctx.fill();

    // In animated mode: phase 1 (0..0.7) draws secant chord, phase 2 (0.7..1) drops line and pulses intercept
    const lineProgress = animT < 1.0 ? Math.min(animT / 0.7, 1.0) : 1.0;

    ctx.strokeStyle = colors.warning;
    ctx.lineWidth = 2;
    ctx.beginPath();

    const minX = Math.min(s0x, s1x, s2x) - 30;
    const slope = (s1y - s0y) / (s1x - s0x);
    const fullEnd = s2x + (s2x > s1x ? 25 : -25);
    const curEnd = minX + (fullEnd - minX) * lineProgress;

    ctx.moveTo(minX, s0y + slope * (minX - s0x));
    ctx.lineTo(curEnd, s0y + slope * (curEnd - s0x));
    ctx.stroke();

    // Intercept dot & vertical dashed line
    if (animT >= 0.6) {
      const dropProgress = animT < 1.0 ? (animT - 0.6) / 0.4 : 1.0;
      ctx.strokeStyle = colors.warning;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(s2x, s2y);
      try {
        const fp2Y = toScreenY(state.f(p2));
        ctx.lineTo(s2x, s2y + (fp2Y - s2y) * dropProgress);
      } catch (e) {}
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = colors.primary;
      ctx.beginPath();
      ctx.arc(s2x, s2y, 6, 0, Math.PI * 2);
      ctx.fill();

      // Ripple ring on intercept landing
      if (animT > 0.7 && animT < 1.0) {
        const rFrac = (animT - 0.7) / 0.3;
        ctx.strokeStyle = colors.primary;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(s2x, s2y, 6 + rFrac * 18, 0, Math.PI * 2);
        ctx.stroke();
      }

      drawCanvasPillText(ctx, `x_(n+1) = ${fmtAdaptive(p2, xSpanNow)}`, s2x + 6, s2y - 10, {
        font: 'bold 11px sans-serif',
        bg: colors.isDark ? 'rgba(15, 23, 42, 0.88)' : 'rgba(255, 255, 255, 0.94)',
        border: colors.warning,
        color: colors.warning,
        padX: 5,
        padY: 2,
        radius: 4
      });
    }
  }

  function renderNewtonConstruction(ctx, row, toScreenX, toScreenY, colors, animT = 1.0) {
    const { xn, fVal, dfVal } = row;
    const sx = toScreenX(xn);
    const sy = toScreenY(fVal);
    const sZero = toScreenY(0);
    const xSpanNow = Math.max(state.view.xMax - state.view.xMin, 1e-15);

    // Phase 1 (0..0.35): vertical line rises up from x-axis to curve point
    const vertProgress = animT < 1.0 ? Math.min(animT / 0.35, 1.0) : 1.0;

    ctx.strokeStyle = colors.danger;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.setLineDash([3, 3]);
    ctx.moveTo(sx, sZero);
    ctx.lineTo(sx, sZero + (sy - sZero) * vertProgress);
    ctx.stroke();
    ctx.setLineDash([]);

    if (animT >= 0.25) {
      ctx.fillStyle = colors.danger;
      ctx.beginPath();
      ctx.arc(sx, sy, 5.5, 0, Math.PI * 2);
      ctx.fill();
    }

    if (Math.abs(dfVal) > 1e-14 && animT >= 0.35) {
      const xNext = xn - fVal / dfVal;
      const sNextX = toScreenX(xNext);

      // Phase 2 (0.35..0.85): tangent line shoots out from (sx, sy) down to (sNextX, sZero)
      const tangProgress = animT < 1.0 ? Math.min((animT - 0.35) / 0.5, 1.0) : 1.0;
      const curEndX = sx + (sNextX - sx) * tangProgress;
      const curEndY = sy + (sZero - sy) * tangProgress;

      ctx.strokeStyle = colors.primary;
      ctx.lineWidth = 2;
      ctx.beginPath();
      const ext = (sNextX - sx) * 0.15;
      ctx.moveTo(sx - ext * tangProgress, sy - ext * tangProgress * ((sZero - sy) / (sNextX - sx)));
      ctx.lineTo(curEndX, curEndY);
      ctx.stroke();

      // Phase 3 (0.75..1.0): intercept marker & ripple ring
      if (animT >= 0.75) {
        ctx.fillStyle = colors.primary;
        ctx.beginPath();
        ctx.arc(sNextX, sZero, 6, 0, Math.PI * 2);
        ctx.fill();

        if (animT > 0.8 && animT < 1.0) {
          const rFrac = (animT - 0.8) / 0.2;
          ctx.strokeStyle = colors.primary;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(sNextX, sZero, 6 + rFrac * 18, 0, Math.PI * 2);
          ctx.stroke();
        }

        drawCanvasPillText(ctx, `x_(n+1) = ${fmtAdaptive(xNext, xSpanNow)}`, sNextX + 6, sZero - 10, {
          font: 'bold 11px sans-serif',
          bg: colors.isDark ? 'rgba(15, 23, 42, 0.88)' : 'rgba(255, 255, 255, 0.94)',
          border: colors.primary,
          color: colors.primary,
          padX: 5,
          padY: 2,
          radius: 4
        });
      }
    }
  }

  function renderFixedPointConstruction(ctx, row, toScreenX, toScreenY, colors, animT = 1.0) {
    const { xn, xNext } = row;
    const sxCurr = toScreenX(xn);
    const syCurr = toScreenY(xn);
    const syCurve = toScreenY(xNext);
    const sxNext = toScreenX(xNext);
    const sZero = toScreenY(0);
    const xSpanNow = Math.max(state.view.xMax - state.view.xMin, 1e-15);

    // Phase 1 (0..0.5): vertical line from (xn, xn) to (xn, g(xn)) = (xn, xNext)
    const vertProg = animT < 1.0 ? Math.min(animT / 0.5, 1.0) : 1.0;
    const curYCurve = syCurr + (syCurve - syCurr) * vertProg;

    ctx.strokeStyle = colors.primary;
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(sxCurr, syCurr);
    ctx.lineTo(sxCurr, curYCurve);
    ctx.stroke();

    if (animT >= 0.25) {
      ctx.fillStyle = colors.primary;
      ctx.beginPath();
      ctx.arc(sxCurr, syCurve, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Phase 2 (0.5..1.0): horizontal line from (xn, xNext) to (xNext, xNext) on line y = x
    if (animT >= 0.5) {
      const horizProg = animT < 1.0 ? Math.min((animT - 0.5) / 0.5, 1.0) : 1.0;
      const curXNext = sxCurr + (sxNext - sxCurr) * horizProg;

      ctx.strokeStyle = colors.warning;
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(sxCurr, syCurve);
      ctx.lineTo(curXNext, syCurve);
      ctx.stroke();

      if (animT >= 0.8) {
        ctx.fillStyle = colors.warning;
        ctx.beginPath();
        ctx.arc(sxNext, syCurve, 6, 0, Math.PI * 2);
        ctx.fill();

        if (animT > 0.85 && animT < 1.0) {
          const rFrac = (animT - 0.85) / 0.15;
          ctx.strokeStyle = colors.warning;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(sxNext, syCurve, 6 + rFrac * 16, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.strokeStyle = colors.textDim || '#94a3b8';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(sxNext, syCurve);
        ctx.lineTo(sxNext, sZero);
        ctx.stroke();
        ctx.setLineDash([]);

        drawCanvasPillText(ctx, `x_(k+1) = ${fmtAdaptive(xNext, xSpanNow)}`, sxNext + 8, syCurve - 10, {
          font: 'bold 11px sans-serif',
          bg: colors.isDark ? 'rgba(15, 23, 42, 0.88)' : 'rgba(255, 255, 255, 0.94)',
          border: colors.warning,
          color: colors.warning,
          padX: 5,
          padY: 2,
          radius: 4
        });
      }
    }
  }

  function renderLinearSystemVisualizer(ctx, width, height, colors) {
    const result = state.currentResult;
    const n = state.linearSystem.dim;

    if (!result || !result.rows || result.rows.length === 0) {
      ctx.fillStyle = colors.text;
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Execute solver to visualize linear system solution.', width / 2, height / 2);
      return;
    }

    const stepIdx = Math.min(state.playback.currentStep - 1, result.rows.length - 1);
    const animT = state.stepAnimation.t;

    if (n === 2) {
      // 2D Phase Plane: 2 Lines L1 and L2, intersection, and iteration path
      const A = state.linearSystem.A;
      const b = state.linearSystem.b;
      const { xMin, xMax, yMin, yMax } = state.view;
      const toScreenX = (x) => ((x - xMin) / (xMax - xMin)) * width;
      const toScreenY = (y) => height - ((y - yMin) / (yMax - yMin)) * height;

      // Draw Adaptive Grid Lines and High-Legibility Ticks
      ctx.lineWidth = 1;
      ctx.strokeStyle = colors.grid;

      const xSpan = Math.max(xMax - xMin, 1e-15);
      const ySpan = Math.max(yMax - yMin, 1e-15);

      const xTicks = calculateNiceTicks(xMin, xMax, Math.max(4, Math.floor(width / 95)));
      const yTicks = calculateNiceTicks(yMin, yMax, Math.max(3, Math.floor(height / 70)));

      // Vertical grid & X-axis ticks
      xTicks.ticks.forEach(x => {
        const sx = toScreenX(x);
        if (sx < 0 || sx > width) return;
        ctx.beginPath();
        ctx.moveTo(sx, 0);
        ctx.lineTo(sx, height);
        ctx.stroke();

        const syZero = Math.min(Math.max(toScreenY(0) + 14, 16), height - 8);
        const label = formatTickLabel(x, xTicks.step);
        drawCanvasPillText(ctx, label, sx, syZero, {
          align: 'center',
          font: '600 10px monospace',
          bg: colors.isDark ? 'rgba(15, 23, 42, 0.78)' : 'rgba(255, 255, 255, 0.88)',
          color: colors.text,
          padX: 3,
          padY: 2,
          radius: 3
        });
      });

      // Horizontal grid & Y-axis ticks
      yTicks.ticks.forEach(y => {
        const sy = toScreenY(y);
        if (sy < 0 || sy > height) return;
        ctx.beginPath();
        ctx.moveTo(0, sy);
        ctx.lineTo(width, sy);
        ctx.stroke();

        if (Math.abs(y) > yTicks.step * 0.1) {
          const sxZero = Math.min(Math.max(toScreenX(0) + 6, 6), width - 45);
          const label = formatTickLabel(y, yTicks.step);
          drawCanvasPillText(ctx, label, sxZero, sy + 3, {
            align: 'left',
            font: '600 10px monospace',
            bg: colors.isDark ? 'rgba(15, 23, 42, 0.78)' : 'rgba(255, 255, 255, 0.88)',
            color: colors.text,
            padX: 3,
            padY: 2,
            radius: 3
          });
        }
      });

      // Main Axes
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = colors.axis;
      const zeroY = toScreenY(0);
      if (zeroY >= 0 && zeroY <= height) {
        ctx.beginPath(); ctx.moveTo(0, zeroY); ctx.lineTo(width, zeroY); ctx.stroke();
      }
      const zeroX = toScreenX(0);
      if (zeroX >= 0 && zeroX <= width) {
        ctx.beginPath(); ctx.moveTo(zeroX, 0); ctx.lineTo(zeroX, height); ctx.stroke();
      }

      // Draw Line 1: A[0][0]*x1 + A[0][1]*x2 = b[0] -> x2 = (b[0] - A[0][0]*x1) / A[0][1]
      if (Math.abs(A[0][1]) > 1e-12) {
        ctx.lineWidth = 2.0;
        ctx.strokeStyle = colors.primary;
        ctx.beginPath();
        const yL1_start = (b[0] - A[0][0] * xMin) / A[0][1];
        const yL1_end = (b[0] - A[0][0] * xMax) / A[0][1];
        ctx.moveTo(toScreenX(xMin), toScreenY(yL1_start));
        ctx.lineTo(toScreenX(xMax), toScreenY(yL1_end));
        ctx.stroke();
      }

      // Draw Line 2: A[1][0]*x1 + A[1][1]*x2 = b[1] -> x2 = (b[1] - A[1][0]*x1) / A[1][1]
      if (Math.abs(A[1][1]) > 1e-12) {
        ctx.lineWidth = 2.0;
        ctx.strokeStyle = colors.success;
        ctx.beginPath();
        const yL2_start = (b[1] - A[1][0] * xMin) / A[1][1];
        const yL2_end = (b[1] - A[1][0] * xMax) / A[1][1];
        ctx.moveTo(toScreenX(xMin), toScreenY(yL2_start));
        ctx.lineTo(toScreenX(xMax), toScreenY(yL2_end));
        ctx.stroke();
      }

      // Draw Solution Target Intersection Point
      if (result.solutionVector) {
        const solSX = toScreenX(result.solutionVector[0]);
        const solSY = toScreenY(result.solutionVector[1]);
        if (solSX >= -20 && solSX <= width + 20 && solSY >= -20 && solSY <= height + 20) {
          ctx.strokeStyle = colors.accent;
          ctx.lineWidth = 1.5;
          ctx.setLineDash([2, 2]);
          ctx.beginPath();
          ctx.arc(solSX, solSY, 8, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      // Draw Iteration Trajectory Path
      const startP = state.linearSystem.x0;
      let pathPts = [[startP[0], startP[1]]];

      for (let i = 0; i < stepIdx; i++) {
        const r = result.rows[i];
        const pX = r.prevX || r.xPrev || startP;
        if (state.method === 'gaussseidel') {
          pathPts.push([r.x[0], pX[1]]);
          pathPts.push([r.x[0], r.x[1]]);
        } else {
          pathPts.push([r.x[0], r.x[1]]);
        }
      }

      // Animated current step
      const curRow = result.rows[stepIdx];
      if (curRow) {
        const pX = curRow.prevX || curRow.xPrev || startP;
        if (state.method === 'gaussseidel') {
          if (animT < 0.5) {
            const frac = animT / 0.5;
            const xInter = pX[0] + (curRow.x[0] - pX[0]) * frac;
            pathPts.push([xInter, pX[1]]);
          } else {
            pathPts.push([curRow.x[0], pX[1]]);
            const frac = (animT - 0.5) / 0.5;
            const yInter = pX[1] + (curRow.x[1] - pX[1]) * frac;
            pathPts.push([curRow.x[0], yInter]);
          }
        } else {
          const frac = animT;
          const xInter = pX[0] + (curRow.x[0] - pX[0]) * frac;
          const yInter = pX[1] + (curRow.x[1] - pX[1]) * frac;
          pathPts.push([xInter, yInter]);
        }
      }

      // Draw Path Line
      if (pathPts.length > 1) {
        ctx.lineWidth = 1.8;
        ctx.strokeStyle = colors.accent;
        ctx.beginPath();
        ctx.moveTo(toScreenX(pathPts[0][0]), toScreenY(pathPts[0][1]));
        for (let p = 1; p < pathPts.length; p++) {
          ctx.lineTo(toScreenX(pathPts[p][0]), toScreenY(pathPts[p][1]));
        }
        ctx.stroke();
      }

      // Draw dots for each iteration point
      ctx.fillStyle = colors.accent;
      for (let p = 0; p < pathPts.length; p++) {
        const px = toScreenX(pathPts[p][0]);
        const py = toScreenY(pathPts[p][1]);
        ctx.beginPath();
        ctx.arc(px, py, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Current Point Marker
      const lastPt = pathPts[pathPts.length - 1];
      const curSX = toScreenX(lastPt[0]);
      const curSY = toScreenY(lastPt[1]);
      ctx.fillStyle = colors.primary;
      ctx.beginPath();
      ctx.arc(curSX, curSY, 6.5, 0, Math.PI * 2);
      ctx.fill();

      // Current position pill
      drawCanvasPillText(ctx, `(x₁, x₂) = (${fmtVal(lastPt[0], 5)}, ${fmtVal(lastPt[1], 5)})`, curSX + 10, curSY - 8, {
        font: 'bold 11px monospace',
        bg: colors.isDark ? 'rgba(15, 23, 42, 0.88)' : 'rgba(255, 255, 255, 0.94)',
        border: colors.primary,
        color: colors.primary,
        padX: 6,
        padY: 2,
        radius: 4
      });

      // Equation pills in top-left
      drawCanvasPillText(ctx, `L₁: ${fmtVal(A[0][0])}x₁ + ${fmtVal(A[0][1])}x₂ = ${fmtVal(b[0])}`, 14, 22, {
        font: 'bold 11px sans-serif',
        bg: colors.isDark ? 'rgba(15, 23, 42, 0.82)' : 'rgba(255, 255, 255, 0.92)',
        border: colors.primary,
        color: colors.primary,
        padX: 6,
        padY: 3,
        radius: 4
      });

      drawCanvasPillText(ctx, `L₂: ${fmtVal(A[1][0])}x₁ + ${fmtVal(A[1][1])}x₂ = ${fmtVal(b[1])}`, 14, 46, {
        font: 'bold 11px sans-serif',
        bg: colors.isDark ? 'rgba(15, 23, 42, 0.82)' : 'rgba(255, 255, 255, 0.92)',
        border: colors.success,
        color: colors.success,
        padX: 6,
        padY: 3,
        radius: 4
      });

      // Zoom HUD in Top Right
      const origSpan = (state.view.origXMax && state.view.origXMin)
        ? Math.max(state.view.origXMax - state.view.origXMin, 1e-6)
        : Math.max(xSpan, 1);
      const zoomFactor = Math.max(1, origSpan / Math.max(xSpan, 1e-15));

      let zoomText = '1.0×';
      if (zoomFactor >= 1e6) {
        zoomText = `${(zoomFactor / 1e6).toFixed(1)}M×`;
      } else if (zoomFactor >= 1000) {
        zoomText = `${(zoomFactor / 1000).toFixed(1)}k×`;
      } else if (zoomFactor > 1.1) {
        zoomText = `${Math.round(zoomFactor)}×`;
      }

      const spanText = xSpan < 0.001 ? xSpan.toExponential(2) : xSpan.toFixed(xSpan < 1 ? 4 : 2);
      const hudText = state.autoZoom.enabled
        ? `🔍 Auto-Zoom: ${zoomText} • Δx = ${spanText}`
        : `🔍 View: ${zoomText} • Δx = ${spanText}`;

      drawCanvasPillText(ctx, hudText, width - 14, 22, {
        align: 'right',
        fontSize: 10,
        font: '600 11px monospace',
        bg: colors.isDark ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.92)',
        border: state.autoZoom.enabled ? colors.primary : colors.border,
        color: state.autoZoom.enabled ? colors.primary : colors.textMuted,
        padX: 8,
        padY: 4,
        radius: 12
      });

    } else {
      // General n >= 3: Component Trajectories Chart (x_i vs Iteration k)
      const padding = { top: 30, right: 90, bottom: 40, left: 60 };
      const plotW = width - padding.left - padding.right;
      const plotH = height - padding.top - padding.bottom;

      const totalSteps = result.rows.length;
      let minVal = Infinity;
      let maxVal = -Infinity;

      state.linearSystem.x0.forEach(v => {
        if (v < minVal) minVal = v;
        if (v > maxVal) maxVal = v;
      });

      result.rows.forEach(r => {
        r.x.forEach(v => {
          if (v < minVal) minVal = v;
          if (v > maxVal) maxVal = v;
        });
      });

      if (!isFinite(minVal) || !isFinite(maxVal) || minVal === maxVal) {
        minVal -= 1;
        maxVal += 1;
      }
      const valMargin = (maxVal - minVal) * 0.15 || 1.0;
      minVal -= valMargin;
      maxVal += valMargin;

      const toPlotX = (iter) => padding.left + (iter / Math.max(totalSteps, 1)) * plotW;
      const toPlotY = (val) => padding.top + plotH - ((val - minVal) / (maxVal - minVal)) * plotH;

      // Draw Grid & Axes
      ctx.lineWidth = 1;
      ctx.strokeStyle = colors.grid;

      const yTicks = 6;
      ctx.fillStyle = colors.text;
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';

      for (let t = 0; t <= yTicks; t++) {
        const val = minVal + (t / yTicks) * (maxVal - minVal);
        const sy = toPlotY(val);
        ctx.beginPath();
        ctx.moveTo(padding.left, sy);
        ctx.lineTo(padding.left + plotW, sy);
        ctx.stroke();
        ctx.fillText(fmtVal(val, 3), padding.left - 8, sy + 3);
      }

      ctx.textAlign = 'center';
      const xTickStep = Math.max(1, Math.ceil(totalSteps / 10));
      for (let k = 0; k <= totalSteps; k += xTickStep) {
        const sx = toPlotX(k);
        ctx.beginPath();
        ctx.moveTo(sx, padding.top);
        ctx.lineTo(sx, padding.top + plotH);
        ctx.stroke();
        ctx.fillText(`k=${k}`, sx, padding.top + plotH + 16);
      }

      const compColors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

      for (let c = 0; c < n; c++) {
        const cColor = compColors[c % compColors.length];
        ctx.strokeStyle = cColor;
        ctx.lineWidth = 2.0;
        ctx.beginPath();

        const y0 = state.linearSystem.x0[c] || 0;
        ctx.moveTo(toPlotX(0), toPlotY(y0));

        for (let k = 1; k <= stepIdx; k++) {
          const val = result.rows[k - 1].x[c];
          ctx.lineTo(toPlotX(k), toPlotY(val));
        }

        const curRow = result.rows[stepIdx];
        if (curRow) {
          const prevV = curRow.prevX[c];
          const nextV = curRow.x[c];
          const curV = prevV + (nextV - prevV) * animT;
          ctx.lineTo(toPlotX(stepIdx + animT), toPlotY(curV));
        }
        ctx.stroke();

        ctx.fillStyle = cColor;
        for (let k = 0; k <= stepIdx; k++) {
          const val = k === 0 ? (state.linearSystem.x0[c] || 0) : result.rows[k - 1].x[c];
          ctx.beginPath();
          ctx.arc(toPlotX(k), toPlotY(val), 3.5, 0, Math.PI * 2);
          ctx.fill();
        }

        if (curRow) {
          const curV = curRow.prevX[c] + (curRow.x[c] - curRow.prevX[c]) * animT;
          const curSX = toPlotX(stepIdx + animT);
          const curSY = toPlotY(curV);

          ctx.fillStyle = cColor;
          ctx.beginPath();
          ctx.arc(curSX, curSY, 5.5, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = colors.textMain;
          ctx.font = 'bold 10px monospace';
          ctx.textAlign = 'left';
          ctx.fillText(`x${c+1}=${fmtVal(curV, 3)}`, curSX + 7, curSY + 3);
        }

        ctx.fillStyle = cColor;
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`x${c+1}`, padding.left + plotW + 12, padding.top + 16 + c * 20);
      }
    }
  }

  /**
   * Panel 2: Error Trajectory Semi-Log Decay Plot
   */
  function renderErrorCanvas() {
    const canvas = el.errorCanvas;
    if (!canvas) return;
    const { width, height, ctx } = resizeCanvas(canvas);
    const colors = getThemeColors();

    ctx.clearRect(0, 0, width, height);

    const result = state.currentResult;
    if (!result || result.rows.length === 0) {
      ctx.fillStyle = colors.text;
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Execute solver to visualize error convergence trajectory.', width / 2, height / 2);
      return;
    }

    const padding = { top: 25, right: 30, bottom: 35, left: 55 };
    const plotW = width - padding.left - padding.right;
    const plotH = height - padding.top - padding.bottom;

    // Filter valid error points (relative error in %)
    const errorPoints = result.rows
      .map((r, idx) => ({
        iter: r.iteration,
        relEaPct: r.relEa !== null && isFinite(r.relEa) ? r.relEa * 100 : null
      }))
      .filter(p => p.relEaPct !== null && p.relEaPct > 0);

    if (errorPoints.length === 0) {
      ctx.fillStyle = colors.text;
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Single iteration completed. No error decay trajectory.', width / 2, height / 2);
      return;
    }

    const tolPct = state.tol * 100;
    const allErrors = errorPoints.map(p => p.relEaPct).concat([tolPct]);
    const minErr = Math.min(...allErrors);
    const maxErr = Math.max(...allErrors);

    // Log10 range
    const logMin = Math.floor(Math.log10(Math.max(minErr, 1e-14)));
    const logMax = Math.ceil(Math.log10(Math.max(maxErr, 1e-2)));
    const logRange = Math.max(logMax - logMin, 1);

    const maxIter = Math.max(result.rows[result.rows.length - 1].iteration, 2);

    const toScreenX = (iter) => padding.left + ((iter - 1) / (maxIter - 1)) * plotW;
    const toScreenY = (val) => {
      const logV = Math.log10(Math.max(val, 1e-16));
      return padding.top + ((logMax - logV) / logRange) * plotH;
    };

    // 1. Draw Grid Lines & Log Ticks
    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = 1;

    for (let p = logMin; p <= logMax; p++) {
      const sy = padding.top + ((logMax - p) / logRange) * plotH;
      ctx.beginPath();
      ctx.moveTo(padding.left, sy);
      ctx.lineTo(width - padding.right, sy);
      ctx.stroke();

      ctx.fillStyle = colors.text;
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`10^${p}%`, padding.left - 6, sy + 3);
    }

    // Iteration X ticks
    for (let it = 1; it <= maxIter; it += Math.max(1, Math.floor(maxIter / 8))) {
      const sx = toScreenX(it);
      ctx.beginPath();
      ctx.moveTo(sx, padding.top);
      ctx.lineTo(sx, height - padding.bottom);
      ctx.stroke();

      ctx.fillStyle = colors.text;
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`k=${it}`, sx, height - padding.bottom + 16);
    }

    // 2. Plot Tolerance Threshold Dashed Line
    const tolY = toScreenY(tolPct);
    ctx.strokeStyle = colors.primary;
    ctx.lineWidth = 1.8;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(padding.left, tolY);
    ctx.lineTo(width - padding.right, tolY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = colors.primary;
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`Tol (${fmtVal(tolPct, 4)}%)`, padding.left + 8, tolY - 5);

    // 3. Plot Relative Error Decay Line
    ctx.strokeStyle = colors.danger;
    ctx.lineWidth = 2.2;
    ctx.beginPath();

    errorPoints.forEach((pt, i) => {
      const sx = toScreenX(pt.iter);
      const sy = toScreenY(pt.relEaPct);
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    });
    ctx.stroke();

    // 4. Highlight dots
    const activeStep = state.playback.currentStep;

    errorPoints.forEach((pt) => {
      const sx = toScreenX(pt.iter);
      const sy = toScreenY(pt.relEaPct);
      const isActive = pt.iter === activeStep;

      ctx.fillStyle = isActive ? colors.primary : colors.danger;
      ctx.beginPath();
      ctx.arc(sx, sy, isActive ? 6 : 3.5, 0, Math.PI * 2);
      ctx.fill();

      if (isActive) {
        ctx.strokeStyle = colors.bg;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });
  }

  /**
   * Shootout Comparison Convergence Canvas
   */
  function renderShootoutCanvas() {
    const canvas = el.shootoutCanvas;
    if (!canvas) return;
    const { width, height, ctx } = resizeCanvas(canvas);
    const colors = getThemeColors();

    ctx.clearRect(0, 0, width, height);

    const sResults = state.shootoutResults;
    if (!sResults) return;

    const padding = { top: 25, right: 140, bottom: 35, left: 60 };
    const plotW = width - padding.left - padding.right;
    const plotH = height - padding.top - padding.bottom;

    const series = sResults.isLinear ? [
      { name: 'Jacobi', res: sResults.jacobi, color: colors.primary },
      { name: 'Gauss-Seidel', res: sResults.gaussseidel, color: colors.success }
    ] : [
      { name: 'Bisection', res: sResults.bisection, color: colors.primary },
      { name: 'Secant', res: sResults.secant, color: colors.warning },
      { name: 'Newton', res: sResults.newton, color: colors.success },
      ...(sResults.fixedpoint ? [{ name: 'Fixed-Point', res: sResults.fixedpoint, color: '#a855f7' }] : [])
    ];

    let maxIter = 2;
    let minErr = 100;
    let maxErr = 1e-4;

    series.forEach(s => {
      if (!s.res || !s.res.rows) return;
      s.res.rows.forEach(r => {
        if (r.iteration > maxIter) maxIter = r.iteration;
        if (r.relEa !== null && isFinite(r.relEa) && r.relEa > 0) {
          const val = r.relEa * 100;
          if (val < minErr) minErr = val;
          if (val > maxErr) maxErr = val;
        }
      });
    });

    const tolPct = state.tol * 100;
    minErr = Math.min(minErr, tolPct);

    const logMin = Math.floor(Math.log10(Math.max(minErr, 1e-15)));
    const logMax = Math.ceil(Math.log10(Math.max(maxErr, 1e1)));
    const logRange = Math.max(logMax - logMin, 1);

    const toScreenX = (iter) => padding.left + ((iter - 1) / (maxIter - 1)) * plotW;
    const toScreenY = (val) => {
      const logV = Math.log10(Math.max(val, 1e-16));
      return padding.top + ((logMax - logV) / logRange) * plotH;
    };

    // Draw grid
    ctx.strokeStyle = colors.grid;
    for (let p = logMin; p <= logMax; p += 2) {
      const sy = padding.top + ((logMax - p) / logRange) * plotH;
      ctx.beginPath();
      ctx.moveTo(padding.left, sy);
      ctx.lineTo(width - padding.right, sy);
      ctx.stroke();

      ctx.fillStyle = colors.text;
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`10^${p}%`, padding.left - 6, sy + 3);
    }

    // Tolerance Line
    const tolY = toScreenY(tolPct);
    ctx.strokeStyle = colors.danger;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(padding.left, tolY);
    ctx.lineTo(width - padding.right, tolY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw each series
    series.forEach((s) => {
      if (!s.res || !s.res.rows) return;
      const pts = s.res.rows
        .map(r => ({ iter: r.iteration, pct: r.relEa !== null && isFinite(r.relEa) ? r.relEa * 100 : null }))
        .filter(p => p.pct !== null && p.pct > 0);

      if (pts.length === 0) return;

      ctx.strokeStyle = s.color;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      pts.forEach((p, i) => {
        const sx = toScreenX(p.iter);
        const sy = toScreenY(p.pct);
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      });
      ctx.stroke();

      pts.forEach(p => {
        const sx = toScreenX(p.iter);
        const sy = toScreenY(p.pct);
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(sx, sy, 3.5, 0, Math.PI * 2);
        ctx.fill();
      });
    });

    // Legend
    let legendY = padding.top + 10;
    series.forEach(s => {
      ctx.fillStyle = s.color;
      ctx.fillRect(width - padding.right + 15, legendY, 14, 14);
      ctx.fillStyle = colors.textMain;
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(s.name, width - padding.right + 35, legendY + 11);
      legendY += 24;
    });

    // Tol legend
    ctx.fillStyle = colors.danger;
    ctx.fillRect(width - padding.right + 15, legendY, 14, 3);
    ctx.fillStyle = colors.text;
    ctx.font = '10px sans-serif';
    ctx.fillText('Tolerance', width - padding.right + 35, legendY + 6);
  }

  function renderCanvases() {
    renderGeomCanvas();
    renderErrorCanvas();
    renderShootoutCanvas();
  }

  /* ==========================================================================
     7. CANVAS INTERACTIVITY (PAN, ZOOM, TOOLTIP)
     ========================================================================== */

  /* ==========================================================================
     7. CANVAS INTERACTIVITY (PAN, SELECT ZOOM, TOOLTIPS)
     ========================================================================== */

  function animateViewToBounds(targetXMin, targetXMax, targetYMin, targetYMax, duration = 320) {
    if (state.view.zoomAnimId) {
      cancelAnimationFrame(state.view.zoomAnimId);
      state.view.zoomAnimId = null;
    }

    const startXMin = state.view.xMin;
    const startXMax = state.view.xMax;
    const startYMin = state.view.yMin;
    const startYMax = state.view.yMax;

    const startXC = (startXMin + startXMax) / 2;
    const startYC = (startYMin + startYMax) / 2;
    const startXSpan = Math.max(startXMax - startXMin, 1e-15);
    const startYSpan = Math.max(startYMax - startYMin, 1e-15);

    const targetXC = (targetXMin + targetXMax) / 2;
    const targetYC = (targetYMin + targetYMax) / 2;
    const targetXSpan = Math.max(targetXMax - targetXMin, 1e-15);
    const targetYSpan = Math.max(targetYMax - targetYMin, 1e-15);

    // Adaptive duration for smooth perceptual continuity across scale changes
    const ratioX = Math.max(startXSpan / targetXSpan, targetXSpan / startXSpan);
    const ratioY = Math.max(startYSpan / targetYSpan, targetYSpan / startYSpan);
    const maxRatio = Math.max(ratioX, ratioY);
    const logRatio = Math.abs(Math.log10(maxRatio));
    const maxAllowedDur = (state.playback && state.playback.isPlaying)
      ? Math.max(160, state.playback.speed * 0.88)
      : 580;
    const adaptiveDuration = Math.min(maxAllowedDur, Math.max(180, duration + logRatio * 30));

    const startTime = performance.now();

    function step(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / adaptiveDuration, 1.0);
      // Smooth sinusoidal-cubic ease in-out
      const ease = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      // Linear Center interpolation + Geometric (log-linear) Span interpolation
      const curXC = startXC + (targetXC - startXC) * ease;
      const curYC = startYC + (targetYC - startYC) * ease;
      const curXSpan = Math.exp(Math.log(startXSpan) + (Math.log(targetXSpan) - Math.log(startXSpan)) * ease);
      const curYSpan = Math.exp(Math.log(startYSpan) + (Math.log(targetYSpan) - Math.log(startYSpan)) * ease);

      state.view.xMin = curXC - curXSpan / 2;
      state.view.xMax = curXC + curXSpan / 2;
      state.view.yMin = curYC - curYSpan / 2;
      state.view.yMax = curYC + curYSpan / 2;

      renderGeomCanvas();

      if (progress < 1.0) {
        state.view.zoomAnimId = requestAnimationFrame(step);
      } else {
        state.view.zoomAnimId = null;
      }
    }

    state.view.zoomAnimId = requestAnimationFrame(step);
  }

  function initCanvasInteractions() {
    const canvas = el.geomCanvas;
    if (!canvas) return;

    // Auto-fit function view bounds based on root and brackets
    function autoFitView(a, b, root) {
      const r = isFinite(root) && root !== null ? root : (a + b) / 2;
      const span = Math.max(Math.abs(b - a), 1.5);
      state.view.xMin = r - span * 1.4;
      state.view.xMax = r + span * 1.4;

      // Sample y values to compute suitable y span
      let minVal = -1;
      let maxVal = 1;
      if (state.method === 'fixedpoint' && state.fixedPoint && state.fixedPoint.g) {
        minVal = state.view.xMin;
        maxVal = state.view.xMax;
        for (let i = 0; i <= 30; i++) {
          const tx = state.view.xMin + (i / 30) * (state.view.xMax - state.view.xMin);
          try {
            const v = state.fixedPoint.g(tx);
            if (isFinite(v) && !isNaN(v)) {
              if (v < minVal) minVal = v;
              if (v > maxVal) maxVal = v;
            }
          } catch (e) {}
        }
      } else if (state.f) {
        for (let i = 0; i <= 30; i++) {
          const tx = state.view.xMin + (i / 30) * (state.view.xMax - state.view.xMin);
          try {
            const v = state.f(tx);
            if (isFinite(v) && !isNaN(v)) {
              if (v < minVal) minVal = v;
              if (v > maxVal) maxVal = v;
            }
          } catch (e) {}
        }
      }
      const ySpan = Math.max(maxVal - minVal, 2);
      state.view.yMin = minVal - ySpan * 0.25;
      state.view.yMax = maxVal + ySpan * 0.25;

      // Record original reset bounds
      state.view.origXMin = state.view.xMin;
      state.view.origXMax = state.view.xMax;
      state.view.origYMin = state.view.yMin;
      state.view.origYMax = state.view.yMax;

      renderGeomCanvas();
    }

    // Set Active Tool Mode: Pan vs Select Zoom
    function setTool(toolName) {
      state.view.tool = toolName;
      if (el.toolPan) {
        el.toolPan.classList.toggle('active', toolName === 'pan');
        el.toolPan.setAttribute('aria-pressed', toolName === 'pan');
      }
      if (el.toolSelectZoom) {
        el.toolSelectZoom.classList.toggle('active', toolName === 'select-zoom');
        el.toolSelectZoom.setAttribute('aria-pressed', toolName === 'select-zoom');
      }
      if (el.canvasHint) {
        el.canvasHint.innerHTML = toolName === 'select-zoom' ?
          'Drag a box to zoom into area &bull; Double-click to reset' :
          'Drag to pan &bull; Shift+drag to box zoom &bull; Scroll to zoom';
      }
      canvas.style.cursor = toolName === 'select-zoom' ? 'crosshair' : 'grab';
    }

    if (el.toolPan) {
      el.toolPan.addEventListener('click', () => setTool('pan'));
    }
    if (el.toolSelectZoom) {
      el.toolSelectZoom.addEventListener('click', () => setTool('select-zoom'));
    }

    // Zoom In / Zoom Out toolbar buttons
    function zoomByFactor(factor) {
      const midX = (state.view.xMin + state.view.xMax) / 2;
      const midY = (state.view.yMin + state.view.yMax) / 2;
      const halfX = ((state.view.xMax - state.view.xMin) * factor) / 2;
      const halfY = ((state.view.yMax - state.view.yMin) * factor) / 2;
      animateViewToBounds(midX - halfX, midX + halfX, midY - halfY, midY + halfY, 250);
    }

    if (el.btnZoomIn) {
      el.btnZoomIn.addEventListener('click', () => zoomByFactor(0.72));
    }
    if (el.btnZoomOut) {
      el.btnZoomOut.addEventListener('click', () => zoomByFactor(1.38));
    }

    // Reset Viewport button
    if (el.btnResetView) {
      el.btnResetView.addEventListener('click', () => {
        animateViewToBounds(state.view.origXMin, state.view.origXMax, state.view.origYMin, state.view.origYMax, 300);
      });
    }

    // Double-click on canvas resets to initial framing
    canvas.addEventListener('dblclick', () => {
      animateViewToBounds(state.view.origXMin, state.view.origXMax, state.view.origYMin, state.view.origYMax, 300);
    });

    function updateSelectionBox() {
      if (!el.canvasSelectionBox) return;
      const sx1 = Math.min(state.selection.startX, state.selection.currentX);
      const sx2 = Math.max(state.selection.startX, state.selection.currentX);
      const sy1 = Math.min(state.selection.startY, state.selection.currentY);
      const sy2 = Math.max(state.selection.startY, state.selection.currentY);

      el.canvasSelectionBox.style.left = `${sx1}px`;
      el.canvasSelectionBox.style.top = `${sy1}px`;
      el.canvasSelectionBox.style.width = `${sx2 - sx1}px`;
      el.canvasSelectionBox.style.height = `${sy2 - sy1}px`;

      const rect = canvas.getBoundingClientRect();
      const xSpan = state.view.xMax - state.view.xMin;
      const ySpan = state.view.yMax - state.view.yMin;
      const dx = Math.abs((sx2 - sx1) / rect.width * xSpan);
      const dy = Math.abs((sy2 - sy1) / rect.height * ySpan);

      if (el.canvasSelectionLabel) {
        el.canvasSelectionLabel.textContent = `Δx: ${cleanNum(dx, 1e-4).toFixed(3)}, Δy: ${cleanNum(dy, 1e-4).toFixed(3)}`;
      }
    }

    // Mouse Down: Start Pan or Select Zoom
    canvas.addEventListener('mousedown', (e) => {
      if (state.view.zoomAnimId) {
        cancelAnimationFrame(state.view.zoomAnimId);
        state.view.zoomAnimId = null;
      }

      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const isSelectZoom = state.view.tool === 'select-zoom' || e.shiftKey;

      if (isSelectZoom) {
        state.selection.active = true;
        state.selection.startX = mouseX;
        state.selection.startY = mouseY;
        state.selection.currentX = mouseX;
        state.selection.currentY = mouseY;
        updateSelectionBox();
        if (el.canvasSelectionBox) el.canvasSelectionBox.style.display = 'block';
      } else {
        state.view.isDragging = true;
        state.view.dragStartX = e.clientX;
        state.view.dragStartY = e.clientY;
        canvas.style.cursor = 'grabbing';
      }
    });

    window.addEventListener('mousemove', (e) => {
      // 1. Handling Box Selection Drag
      if (state.selection.active) {
        const rect = canvas.getBoundingClientRect();
        state.selection.currentX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
        state.selection.currentY = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
        updateSelectionBox();
        return;
      }

      // 2. Handling Pan Drag
      if (state.view.isDragging) {
        const dx = e.clientX - state.view.dragStartX;
        const dy = e.clientY - state.view.dragStartY;
        state.view.dragStartX = e.clientX;
        state.view.dragStartY = e.clientY;

        const rect = canvas.getBoundingClientRect();
        const xRange = state.view.xMax - state.view.xMin;
        const yRange = state.view.yMax - state.view.yMin;

        const xShift = (dx / rect.width) * xRange;
        const yShift = (dy / rect.height) * yRange;

        state.view.xMin -= xShift;
        state.view.xMax -= xShift;
        state.view.yMin += yShift;
        state.view.yMax += yShift;

        renderGeomCanvas();
        return;
      }

      // 3. Hover coordinate tooltip
      handleCanvasHover(e);
    });

    window.addEventListener('mouseup', () => {
      // Finish Select Zoom Drag
      if (state.selection.active) {
        state.selection.active = false;
        if (el.canvasSelectionBox) el.canvasSelectionBox.style.display = 'none';

        const sx1 = Math.min(state.selection.startX, state.selection.currentX);
        const sx2 = Math.max(state.selection.startX, state.selection.currentX);
        const sy1 = Math.min(state.selection.startY, state.selection.currentY);
        const sy2 = Math.max(state.selection.startY, state.selection.currentY);

        const w = sx2 - sx1;
        const h = sy2 - sy1;

        if (w > 8 && h > 8) {
          const rect = canvas.getBoundingClientRect();
          const xSpan = state.view.xMax - state.view.xMin;
          const ySpan = state.view.yMax - state.view.yMin;

          const newXMin = state.view.xMin + (sx1 / rect.width) * xSpan;
          const newXMax = state.view.xMin + (sx2 / rect.width) * xSpan;
          // Invert Y because canvas Y=0 is at top
          const newYMax = state.view.yMax - (sy1 / rect.height) * ySpan;
          const newYMin = state.view.yMax - (sy2 / rect.height) * ySpan;

          animateViewToBounds(newXMin, newXMax, newYMin, newYMax, 300);
        }
      }

      if (state.view.isDragging) {
        state.view.isDragging = false;
        canvas.style.cursor = state.view.tool === 'select-zoom' ? 'crosshair' : 'grab';
      }
    });

    // Mouse Wheel to Zoom centered at cursor
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (state.view.zoomAnimId) {
        cancelAnimationFrame(state.view.zoomAnimId);
        state.view.zoomAnimId = null;
      }
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const normX = mouseX / rect.width;
      const normY = (rect.height - mouseY) / rect.height;

      const factor = e.deltaY < 0 ? 0.85 : 1.18;

      const xRange = (state.view.xMax - state.view.xMin) * factor;
      const yRange = (state.view.yMax - state.view.yMin) * factor;

      const cursorMathX = state.view.xMin + normX * (state.view.xMax - state.view.xMin);
      const cursorMathY = state.view.yMin + normY * (state.view.yMax - state.view.yMin);

      state.view.xMin = cursorMathX - normX * xRange;
      state.view.xMax = cursorMathX + (1 - normX) * xRange;
      state.view.yMin = cursorMathY - normY * yRange;
      state.view.yMax = cursorMathY + (1 - normY) * yRange;

      renderGeomCanvas();
    }, { passive: false });

    function handleCanvasHover(e) {
      const rect = canvas.getBoundingClientRect();
      if (
        e.clientX < rect.left || e.clientX > rect.right ||
        e.clientY < rect.top || e.clientY > rect.bottom
      ) {
        if (el.canvasTooltip) el.canvasTooltip.style.display = 'none';
        return;
      }

      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const mathX = state.view.xMin + (mx / rect.width) * (state.view.xMax - state.view.xMin);

      let mathY = null;
      if (state.f) {
        try {
          mathY = state.f(mathX);
        } catch (err) {}
      }

      if (mathY !== null && isFinite(mathY)) {
        if (el.canvasTooltip) {
          el.canvasTooltip.style.display = 'block';
          el.canvasTooltip.style.left = `${mx + 12}px`;
          el.canvasTooltip.style.top = `${my - 28}px`;
          el.canvasTooltip.innerHTML = `x: ${fmtVal(mathX, 4)}<br>f(x): ${fmtVal(mathY, 4)}`;
        }
      } else {
        if (el.canvasTooltip) el.canvasTooltip.style.display = 'none';
      }
    }

    // Automatic Graph Zooming: Calculate bounding box framing the active step
    function calculateStepBounds(step) {
      const res = state.currentResult;
      if (!res || !res.rows || res.rows.length === 0) return null;
      const idx = Math.max(0, Math.min(step - 1, res.rows.length - 1));
      const row = res.rows[idx];
      if (!row) return null;

      let targetXMin, targetXMax, targetYMin, targetYMax;

      if (state.method === 'bisection') {
        const a = row.a;
        const b = row.b;
        const c = row.c;
        const rawSpan = Math.abs(b - a);
        const span = Math.max(rawSpan, 1e-11);
        const pad = span * 0.45;
        targetXMin = Math.min(a, b, c) - pad;
        targetXMax = Math.max(a, b, c) + pad;

        const yVals = [0];
        if (state.f) {
          const testXs = [a, b, c, targetXMin, targetXMax];
          for (let i = 1; i <= 6; i++) {
            testXs.push(targetXMin + (i / 7) * (targetXMax - targetXMin));
          }
          testXs.forEach(x => {
            try {
              const v = state.f(x);
              if (isFinite(v) && !isNaN(v)) yVals.push(v);
            } catch(e){}
          });
        }
        const yMin = Math.min(...yVals);
        const yMax = Math.max(...yVals);
        const ySpan = Math.max(Math.abs(yMax - yMin), span * 0.05, 1e-11);
        targetYMin = yMin - ySpan * 0.35;
        targetYMax = yMax + ySpan * 0.35;
      } else if (state.method === 'secant') {
        const p0 = row.p0;
        const p1 = row.p1;
        const p2 = row.p2;
        const minX = Math.min(p0, p1, p2);
        const maxX = Math.max(p0, p1, p2);
        let rawSpan = maxX - minX;
        if (rawSpan < 1e-11 && idx > 0 && res.rows[idx - 1]) {
          const prev = res.rows[idx - 1];
          const prevSpan = Math.max(prev.p0, prev.p1, prev.p2) - Math.min(prev.p0, prev.p1, prev.p2);
          if (prevSpan > 1e-11) rawSpan = prevSpan * 0.35;
        }
        const span = Math.max(rawSpan, 1e-11);
        const pad = span * 0.45;
        targetXMin = minX - pad;
        targetXMax = maxX + pad;

        const yVals = [0, row.f0 ?? 0, row.f1 ?? 0, row.fVal ?? 0];
        if (state.f) {
          for (let i = 1; i <= 6; i++) {
            try {
              const v = state.f(targetXMin + (i / 7) * (targetXMax - targetXMin));
              if (isFinite(v) && !isNaN(v)) yVals.push(v);
            } catch(e){}
          }
        }
        const yMin = Math.min(...yVals);
        const yMax = Math.max(...yVals);
        const ySpan = Math.max(Math.abs(yMax - yMin), span * 0.05, 1e-11);
        targetYMin = yMin - ySpan * 0.35;
        targetYMax = yMax + ySpan * 0.35;
      } else if (state.method === 'newton') {
        const xn = row.xn;
        const nextX = (row.dfVal && isFinite(row.dfVal) && Math.abs(row.dfVal) > 1e-14)
          ? xn - (row.fVal / row.dfVal)
          : xn;
        const minX = Math.min(xn, nextX);
        const maxX = Math.max(xn, nextX);
        let rawSpan = maxX - minX;
        if (rawSpan < 1e-11 && idx > 0 && res.rows[idx - 1]) {
          const prevXn = res.rows[idx - 1].xn;
          const prevStep = Math.abs(xn - prevXn);
          if (prevStep > 1e-11) rawSpan = prevStep * 0.35;
        }
        const span = Math.max(rawSpan, 1e-11);
        const pad = span * 0.55;
        targetXMin = minX - pad;
        targetXMax = maxX + pad;

        const yVals = [0, row.fVal ?? 0];
        if (state.f) {
          for (let i = 1; i <= 6; i++) {
            try {
              const v = state.f(targetXMin + (i / 7) * (targetXMax - targetXMin));
              if (isFinite(v) && !isNaN(v)) yVals.push(v);
            } catch(e){}
          }
        }
        const yMin = Math.min(...yVals);
        const yMax = Math.max(...yVals);
        const ySpan = Math.max(Math.abs(yMax - yMin), span * 0.05, 1e-11);
        targetYMin = yMin - ySpan * 0.35;
        targetYMax = yMax + ySpan * 0.35;
      } else if (state.method === 'fixedpoint') {
        const xk = (row.xk !== undefined) ? row.xk : (row.xn !== undefined ? row.xn : (res.root ?? 0));
        const gx = (row.gx !== undefined) ? row.gx : (row.xNext !== undefined ? row.xNext : xk);
        const minVal = Math.min(xk, gx);
        const maxVal = Math.max(xk, gx);
        let rawSpan = maxVal - minVal;
        if (rawSpan < 1e-11 && idx > 0 && res.rows[idx - 1]) {
          const prevRow = res.rows[idx - 1];
          const prevXk = (prevRow.xk !== undefined) ? prevRow.xk : (prevRow.xn ?? xk);
          const prevStep = Math.abs(xk - prevXk);
          if (prevStep > 1e-11) rawSpan = prevStep * 0.35;
        }
        const span = Math.max(rawSpan, 1e-11);
        const pad = span * 0.6;
        targetXMin = minVal - pad;
        targetXMax = maxVal + pad;
        targetYMin = minVal - pad;
        targetYMax = maxVal + pad;
      } else if (state.method === 'jacobi' || state.method === 'gaussseidel') {
        if (state.linearSystem.dim === 2) {
          const solX = res.solutionVector ? res.solutionVector[0] : 0;
          const solY = res.solutionVector ? res.solutionVector[1] : 0;
          const currX = (row.x && row.x[0] !== undefined) ? row.x[0] : solX;
          const currY = (row.x && row.x[1] !== undefined) ? row.x[1] : solY;
          const prevX = (row.prevX && row.prevX[0] !== undefined) ? row.prevX[0] : (row.xPrev ? row.xPrev[0] : currX);
          const prevY = (row.prevX && row.prevX[1] !== undefined) ? row.prevX[1] : (row.xPrev ? row.xPrev[1] : currY);

          // Center on the active step transition
          const midX = (currX + prevX) / 2;
          const midY = (currY + prevY) / 2;

          // Displacement this step and distance to solution
          const stepDist = Math.hypot(currX - prevX, currY - prevY);
          const solDist = Math.hypot(midX - solX, midY - solY);

          // Span smoothly narrows as step displacement and distance to solution decrease
          const origSpan = (state.view.origXMax && state.view.origXMin)
            ? Math.max((state.view.origXMax - state.view.origXMin) / 2, 3)
            : 4;
          let rawSpan = Math.max(stepDist * 1.7, solDist * 1.3);
          if (rawSpan < 1e-8 && idx > 0 && res.rows[idx - 1]) {
            const prevRow = res.rows[idx - 1];
            if (prevRow.x && prevRow.prevX) {
              const pStep = Math.hypot(prevRow.x[0] - prevRow.prevX[0], prevRow.x[1] - prevRow.prevX[1]);
              if (pStep > 1e-8) rawSpan = pStep * 0.5;
            }
          }
          const span = Math.min(Math.max(rawSpan, 1e-8), origSpan);

          targetXMin = midX - span;
          targetXMax = midX + span;
          targetYMin = midY - span;
          targetYMax = midY + span;
        } else {
          targetXMin = 0;
          targetXMax = Math.max(step + 2, 5);
          const vals = [];
          for (let i = 0; i <= idx; i++) {
            if (res.rows[i] && res.rows[i].x) vals.push(...res.rows[i].x);
          }
          const minVal = vals.length > 0 ? Math.min(...vals) : -1;
          const maxVal = vals.length > 0 ? Math.max(...vals) : 1;
          const vSpan = Math.max(Math.abs(maxVal - minVal), 1.0);
          targetYMin = minVal - vSpan * 0.25;
          targetYMax = maxVal + vSpan * 0.25;
        }
      }

      if (!isFinite(targetXMin) || !isFinite(targetXMax) || !isFinite(targetYMin) || !isFinite(targetYMax)) {
        return null;
      }

      return {
        xMin: targetXMin,
        xMax: targetXMax,
        yMin: targetYMin,
        yMax: targetYMax
      };
    }

    function zoomToStep(step, animate = true) {
      if (!state.autoZoom.enabled) return;
      const bounds = calculateStepBounds(step);
      if (!bounds) return;

      if (animate) {
        const duration = (state.playback && state.playback.isPlaying)
          ? Math.max(160, Math.min(520, state.playback.speed * 0.85))
          : Math.max(180, Math.min(600, state.playback.speed * 0.75));
        animateViewToBounds(bounds.xMin, bounds.xMax, bounds.yMin, bounds.yMax, duration);
      } else {
        state.view.xMin = bounds.xMin;
        state.view.xMax = bounds.xMax;
        state.view.yMin = bounds.yMin;
        state.view.yMax = bounds.yMax;
        renderGeomCanvas();
      }
    }

    function syncAutoZoom(enabled) {
      state.autoZoom.enabled = enabled;
      if (el.toolAutoZoom) {
        el.toolAutoZoom.classList.toggle('active', enabled);
        el.toolAutoZoom.setAttribute('aria-pressed', enabled ? 'true' : 'false');
      }
      if (el.toggleAutoZoom) el.toggleAutoZoom.checked = enabled;
      if (el.fsToggleAutoZoom) el.fsToggleAutoZoom.checked = enabled;

      if (enabled && state.currentResult) {
        zoomToStep(state.playback.currentStep, true);
      }
    }

    if (el.toolAutoZoom) {
      el.toolAutoZoom.addEventListener('click', () => {
        syncAutoZoom(!state.autoZoom.enabled);
      });
    }

    if (el.toggleAutoZoom) {
      el.toggleAutoZoom.addEventListener('change', (e) => syncAutoZoom(e.target.checked));
    }
    if (el.fsToggleAutoZoom) {
      el.fsToggleAutoZoom.addEventListener('change', (e) => syncAutoZoom(e.target.checked));
    }

    state.autoFitView = autoFitView;
    state.zoomToStep = zoomToStep;
    state.calculateStepBounds = calculateStepBounds;
    state.syncAutoZoom = syncAutoZoom;
  }

  /* ==========================================================================
     8. PLAYBACK CONTROLLER WITH ANIMATED STEP TRANSITIONS
     ========================================================================== */

  function initPlayback() {
    function setStep(step, animate = true) {
      if (!state.currentResult || state.currentResult.rows.length === 0) return;
      const total = state.currentResult.rows.length;
      const target = Math.max(1, Math.min(step, total));
      const fromStep = state.playback.currentStep;

      if (state.stepAnimation.reqId) {
        cancelAnimationFrame(state.stepAnimation.reqId);
        state.stepAnimation.reqId = null;
      }

      state.playback.currentStep = target;

      // Update both main and fullscreen scrubbers
      if (el.stepSlider) el.stepSlider.value = target;
      if (el.fsStepSlider) el.fsStepSlider.value = target;

      const badgeText = `Step ${target} / ${total}`;
      if (el.stepBadge) el.stepBadge.textContent = badgeText;
      if (el.fsStepBadge) el.fsStepBadge.textContent = badgeText;
      if (el.geomStepLabel) el.geomStepLabel.textContent = `Iteration k = ${target}`;

      updateStepDetail(target);
      highlightTableRow(target);
      renderErrorCanvas();

      const canAnimate = animate && fromStep !== target;

      // Trigger automatic graph camera zooming
      if (state.autoZoom.enabled && state.zoomToStep) {
        state.zoomToStep(target, canAnimate);
      }

      if (canAnimate && state.stepAnimation.enabled) {
        state.stepAnimation.active = true;
        state.stepAnimation.fromStep = fromStep;
        state.stepAnimation.toStep = target;
        state.stepAnimation.duration = (state.playback && state.playback.isPlaying)
          ? Math.max(160, Math.min(520, state.playback.speed * 0.85))
          : Math.max(180, Math.min(650, state.playback.speed * 0.75));
        const startTime = performance.now();

        function frame(now) {
          const elapsed = now - startTime;
          const progress = Math.min(elapsed / state.stepAnimation.duration, 1.0);
          // Ease-out cubic for smooth natural deceleration
          state.stepAnimation.t = 1 - Math.pow(1 - progress, 3);

          renderGeomCanvas();

          if (progress < 1.0) {
            state.stepAnimation.reqId = requestAnimationFrame(frame);
          } else {
            state.stepAnimation.active = false;
            state.stepAnimation.t = 1.0;
            state.stepAnimation.reqId = null;
            renderGeomCanvas();
          }
        }

        state.stepAnimation.reqId = requestAnimationFrame(frame);
      } else {
        state.stepAnimation.active = false;
        state.stepAnimation.t = 1.0;
        renderGeomCanvas();
      }
    }

    // Synchronize Animation Toggles
    function syncAnimToggle(enabled) {
      state.stepAnimation.enabled = enabled;
      if (el.toggleAnimSteps) el.toggleAnimSteps.checked = enabled;
      if (el.fsToggleAnimSteps) el.fsToggleAnimSteps.checked = enabled;
    }

    if (el.toggleAnimSteps) {
      el.toggleAnimSteps.addEventListener('change', (e) => syncAnimToggle(e.target.checked));
    }
    if (el.fsToggleAnimSteps) {
      el.fsToggleAnimSteps.addEventListener('change', (e) => syncAnimToggle(e.target.checked));
    }

    // Synchronize Speed Controls (Main and Fullscreen HUD)
    function syncSpeed(newSpeed) {
      const val = parseInt(newSpeed, 10);
      state.playback.speed = val;
      if (el.playbackSpeed) el.playbackSpeed.value = newSpeed;
      if (el.fsPlaybackSpeed) el.fsPlaybackSpeed.value = newSpeed;

      // If playing, restart the timer with updated speed
      if (state.playback.isPlaying) {
        pause();
        play();
      }
    }

    if (el.playbackSpeed) {
      el.playbackSpeed.addEventListener('change', (e) => syncSpeed(e.target.value));
    }
    if (el.fsPlaybackSpeed) {
      el.fsPlaybackSpeed.addEventListener('change', (e) => syncSpeed(e.target.value));
    }

    function updateStepDetail(step) {
      const res = state.currentResult;
      if (!res || !res.rows[step - 1]) return;
      const row = res.rows[step - 1];

      if (el.stepNumberTag) el.stepNumberTag.textContent = `Iteration ${row.iteration}`;
      if (el.stepActionDesc) el.stepActionDesc.textContent = row.desc;

      let mathHtml = '';
      if (state.method === 'bisection') {
        const fc = fmtVal(row.fVal);
        const signComp = state.f(row.a) * row.fVal < 0 ? '< 0 (Next interval: [a, c])' : '> 0 (Next interval: [c, b])';
        mathHtml = `
          <div><strong>Interval Bracket:</strong> [${fmtVal(row.a)}, ${fmtVal(row.b)}] &bull; <strong>Width:</strong> ${fmtVal(row.b - row.a)}</div>
          <div><strong>Midpoint:</strong> c = (${fmtVal(row.a)} + ${fmtVal(row.b)}) / 2 = <strong>${fmtVal(row.c)}</strong></div>
          <div><strong>f(c):</strong> ${fc} &bull; <strong>Bolzano Check:</strong> f(a)&middot;f(c) ${signComp}</div>
          <div><strong>Absolute Error E<sub>a</sub>:</strong> ${fmtError(row.ea)} &bull; <strong>Relative Error &epsilon;<sub>a</sub>:</strong> ${fmtRelError(row.relEa)}</div>
        `;
      } else if (state.method === 'secant') {
        mathHtml = `
          <div><strong>Points:</strong> x<sub>n-1</sub> = ${fmtVal(row.p0)}, x<sub>n</sub> = ${fmtVal(row.p1)}</div>
          <div><strong>Function Values:</strong> f(x<sub>n-1</sub>) = ${fmtVal(row.f0)}, f(x<sub>n</sub>) = ${fmtVal(row.f1)}</div>
          <div><strong>Secant Intercept:</strong> x<sub>n+1</sub> = <strong>${fmtVal(row.p2)}</strong> &bull; f(x<sub>n+1</sub>) = ${fmtVal(row.fVal)}</div>
          <div><strong>Absolute Error E<sub>a</sub>:</strong> ${fmtError(row.ea)} &bull; <strong>Relative Error &epsilon;<sub>a</sub>:</strong> ${fmtRelError(row.relEa)}</div>
        `;
      } else if (state.method === 'newton') {
        mathHtml = `
          <div><strong>Current Estimate:</strong> x<sub>n</sub> = <strong>${fmtVal(row.xn)}</strong></div>
          <div><strong>Curve Value:</strong> f(x<sub>n</sub>) = ${fmtVal(row.fVal)} &bull; <strong>Derivative:</strong> f'(x<sub>n</sub>) = ${fmtVal(row.dfVal)}</div>
          <div><strong>Newton Step:</strong> &minus;f / f' = ${fmtVal(-row.fVal / row.dfVal)}</div>
          <div><strong>Absolute Error E<sub>a</sub>:</strong> ${fmtError(row.ea)} &bull; <strong>Relative Error &epsilon;<sub>a</sub>:</strong> ${fmtRelError(row.relEa)}</div>
        `;
      } else if (state.method === 'fixedpoint') {
        mathHtml = `
          <div><strong>Current Value:</strong> x<sub>k</sub> = <strong>${fmtVal(row.xk, 8)}</strong></div>
          <div><strong>Function Evaluation:</strong> g(x<sub>k</sub>) = <strong>${fmtVal(row.gx, 8)}</strong> &rarr; Next x<sub>k+1</sub> = ${fmtVal(row.gx, 8)}</div>
          <div><strong>Absolute Error E<sub>a</sub>:</strong> ${fmtError(row.ea)} &bull; <strong>Relative Error &epsilon;<sub>a</sub>:</strong> ${fmtRelError(row.relEa)}</div>
        `;
      } else if (state.method === 'jacobi') {
        const xPrevStr = '[' + (row.xPrev ? row.xPrev.map(v => fmtVal(v, 4)).join(', ') : '') + ']';
        const xNextStr = '[' + (row.x ? row.x.map(v => fmtVal(v, 4)).join(', ') : '') + ']';
        mathHtml = `
          <div><strong>Previous Estimate x<sup>(k-1)</sup>:</strong> ${xPrevStr}</div>
          <div><strong>Simultaneous Update x<sup>(k)</sup>:</strong> <strong>${xNextStr}</strong></div>
          <div><strong>Max Step Change:</strong> E<sub>a</sub> = ${fmtError(row.ea)} &bull; <strong>Max Rel Error &epsilon;<sub>a</sub>:</strong> ${fmtRelError(row.relEa)}</div>
          <div><strong>Residual Norm ||Ax - b||<sub>&infin;</sub>:</strong> ${row.fVal.toExponential(4)}</div>
        `;
      } else if (state.method === 'gaussseidel') {
        const xPrevStr = '[' + (row.xPrev ? row.xPrev.map(v => fmtVal(v, 4)).join(', ') : '') + ']';
        const xNextStr = '[' + (row.x ? row.x.map(v => fmtVal(v, 4)).join(', ') : '') + ']';
        mathHtml = `
          <div><strong>Previous Estimate x<sup>(k-1)</sup>:</strong> ${xPrevStr}</div>
          <div><strong>Successive Displacement x<sup>(k)</sup>:</strong> <strong>${xNextStr}</strong></div>
          <div><strong>Max Step Change:</strong> E<sub>a</sub> = ${fmtError(row.ea)} &bull; <strong>Max Rel Error &epsilon;<sub>a</sub>:</strong> ${fmtRelError(row.relEa)}</div>
          <div><strong>Residual Norm ||Ax - b||<sub>&infin;</sub>:</strong> ${row.fVal.toExponential(4)}</div>
        `;
      }

      if (el.stepDetailMath) el.stepDetailMath.innerHTML = mathHtml;
    }

    function play() {
      if (state.playback.isPlaying) return;
      if (!state.currentResult || !state.currentResult.rows || state.currentResult.rows.length === 0) return;

      const total = state.currentResult.rows.length;
      if (state.playback.currentStep >= total) {
        setStep(1, false);
      }

      state.playback.isPlaying = true;
      if (el.iconPlay) el.iconPlay.style.display = 'none';
      if (el.iconPause) el.iconPause.style.display = 'block';
      if (el.fsIconPlay) el.fsIconPlay.style.display = 'none';
      if (el.fsIconPause) el.fsIconPause.style.display = 'block';

      if (state.playback.timer) {
        clearInterval(state.playback.timer);
        state.playback.timer = null;
      }

      state.playback.timer = setInterval(() => {
        if (!state.currentResult || !state.currentResult.rows) {
          pause();
          return;
        }
        const totalRows = state.currentResult.rows.length;
        if (state.playback.currentStep >= totalRows) {
          pause();
          return;
        }
        setStep(state.playback.currentStep + 1, true);
        if (state.playback.currentStep >= totalRows) {
          pause();
        }
      }, state.playback.speed);
    }

    function pause() {
      state.playback.isPlaying = false;
      if (state.playback.timer) {
        clearInterval(state.playback.timer);
        state.playback.timer = null;
      }
      if (el.iconPlay) el.iconPlay.style.display = 'block';
      if (el.iconPause) el.iconPause.style.display = 'none';
      if (el.fsIconPlay) el.fsIconPlay.style.display = 'block';
      if (el.fsIconPause) el.fsIconPause.style.display = 'none';
    }

    // Attach Play/Pause listeners
    if (el.btnPlayPause) {
      el.btnPlayPause.addEventListener('click', () => {
        if (state.playback.isPlaying) pause();
        else play();
      });
    }
    if (el.fsBtnPlayPause) {
      el.fsBtnPlayPause.addEventListener('click', () => {
        if (state.playback.isPlaying) pause();
        else play();
      });
    }

    // Step Navigation Listeners (Main Bar)
    if (el.btnStepFirst) el.btnStepFirst.addEventListener('click', () => { pause(); setStep(1, true); });
    if (el.btnStepPrev) el.btnStepPrev.addEventListener('click', () => { pause(); setStep(state.playback.currentStep - 1, true); });
    if (el.btnStepNext) el.btnStepNext.addEventListener('click', () => { pause(); setStep(state.playback.currentStep + 1, true); });
    if (el.btnStepLast) el.btnStepLast.addEventListener('click', () => {
      pause();
      if (state.currentResult) setStep(state.currentResult.rows.length, true);
    });

    // Step Navigation Listeners (Fullscreen HUD)
    if (el.fsBtnStepFirst) el.fsBtnStepFirst.addEventListener('click', () => { pause(); setStep(1, true); });
    if (el.fsBtnStepPrev) el.fsBtnStepPrev.addEventListener('click', () => { pause(); setStep(state.playback.currentStep - 1, true); });
    if (el.fsBtnStepNext) el.fsBtnStepNext.addEventListener('click', () => { pause(); setStep(state.playback.currentStep + 1, true); });
    if (el.fsBtnStepLast) el.fsBtnStepLast.addEventListener('click', () => {
      pause();
      if (state.currentResult) setStep(state.currentResult.rows.length, true);
    });

    // Slider Scrubber Inputs
    if (el.stepSlider) {
      el.stepSlider.addEventListener('input', (e) => {
        pause();
        setStep(parseInt(e.target.value, 10), false);
      });
    }
    if (el.fsStepSlider) {
      el.fsStepSlider.addEventListener('input', (e) => {
        pause();
        setStep(parseInt(e.target.value, 10), false);
      });
    }

    state.setStep = setStep;
    state.play = play;
    state.pause = pause;
    state.pausePlayback = pause;
  }

  /* ==========================================================================
     8B. FULLSCREEN GRAPH CONTROLLER
     ========================================================================== */

  function initFullscreenGraph() {
    const panel = el.geomCanvasPanel;
    if (!panel) return;

    function toggleFullscreen() {
      const isFs = document.fullscreenElement === panel || panel.classList.contains('is-fullscreen');

      if (!isFs) {
        if (panel.requestFullscreen) {
          panel.requestFullscreen().catch(() => {
            panel.classList.add('is-fullscreen');
            handleFullscreenStatus(true);
          });
        } else {
          panel.classList.add('is-fullscreen');
          handleFullscreenStatus(true);
        }
      } else {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
        panel.classList.remove('is-fullscreen');
        handleFullscreenStatus(false);
      }
    }

    function handleFullscreenStatus(isFs) {
      if (el.iconEnterFullscreen) el.iconEnterFullscreen.style.display = isFs ? 'none' : 'inline-block';
      if (el.iconExitFullscreen) el.iconExitFullscreen.style.display = isFs ? 'inline-block' : 'none';

      // Re-render canvas with exact viewport geometry
      setTimeout(() => {
        renderGeomCanvas();
      }, 70);
    }

    document.addEventListener('fullscreenchange', () => {
      const isFs = document.fullscreenElement === panel;
      handleFullscreenStatus(isFs);
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && panel.classList.contains('is-fullscreen')) {
        panel.classList.remove('is-fullscreen');
        handleFullscreenStatus(false);
      }
    });

    if (el.btnGeomFullscreen) {
      el.btnGeomFullscreen.addEventListener('click', toggleFullscreen);
    }
    if (el.btnFsExit) {
      el.btnFsExit.addEventListener('click', toggleFullscreen);
    }
  }

  /* ==========================================================================
     8C. SCREEN WIDTH SPAN CONTROLLER
     ========================================================================== */

  function initSpanScreenWidth() {
    if (!el.btnSpanScreen || !el.appLayout) return;

    function toggleSpanWidth() {
      const isSpanned = el.appLayout.classList.toggle('span-screen-width');
      el.btnSpanScreen.classList.toggle('active', isSpanned);
      el.btnSpanScreen.title = isSpanned
        ? 'Restore normal layout (Show sidebar)'
        : 'Span graph window across entire screen width (Collapse sidebar)';
      if (el.iconSpanExpand) el.iconSpanExpand.style.display = isSpanned ? 'none' : 'inline-block';
      if (el.iconSpanCollapse) el.iconSpanCollapse.style.display = isSpanned ? 'inline-block' : 'none';

      // Re-render canvas geometry after layout transition
      setTimeout(() => {
        renderCanvases();
      }, 50);
      setTimeout(() => {
        renderCanvases();
      }, 260);
    }

    el.btnSpanScreen.addEventListener('click', toggleSpanWidth);

    // Keyboard shortcut 'w' or 'W' (when not focused in an input/select)
    window.addEventListener('keydown', (e) => {
      if ((e.key === 'w' || e.key === 'W') && !['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) {
        toggleSpanWidth();
      }
    });

    // Auto-resize with ResizeObserver for ultra-smooth responsiveness
    if (window.ResizeObserver && el.geomCanvasWrapper) {
      const ro = new ResizeObserver(() => {
        renderCanvases();
      });
      ro.observe(el.geomCanvasWrapper);
    }
  }

  /* ==========================================================================
     9. TABULAR DATA RENDERING & EXPORT
     ========================================================================== */

  function renderTable(result, method) {
    if (!result || !result.rows) {
      el.iterationTableHead.innerHTML = '';
      el.iterationTableBody.innerHTML = '';
      el.tableRowCount.textContent = '0';
      return;
    }

    el.tableRowCount.textContent = result.rows.length.toString();

    let theadHtml = '';
    if (method === 'bisection') {
      theadHtml = `
        <tr>
          <th>Iter (k)</th>
          <th>Lower Bound (a)</th>
          <th>Upper Bound (b)</th>
          <th>Midpoint (c)</th>
          <th>f(c)</th>
          <th>Abs Error (E<sub>a</sub>)</th>
          <th>Rel Error (&epsilon;<sub>a</sub>)</th>
        </tr>
      `;
    } else if (method === 'secant') {
      theadHtml = `
        <tr>
          <th>Iter (k)</th>
          <th>x<sub>n-1</sub></th>
          <th>x<sub>n</sub></th>
          <th>x<sub>n+1</sub></th>
          <th>f(x<sub>n+1</sub>)</th>
          <th>Abs Error (E<sub>a</sub>)</th>
          <th>Rel Error (&epsilon;<sub>a</sub>)</th>
        </tr>
      `;
    } else if (method === 'newton') {
      theadHtml = `
        <tr>
          <th>Iter (k)</th>
          <th>x<sub>n</sub></th>
          <th>f(x<sub>n</sub>)</th>
          <th>f'(x<sub>n</sub>)</th>
          <th>Abs Error (E<sub>a</sub>)</th>
          <th>Rel Error (&epsilon;<sub>a</sub>)</th>
        </tr>
      `;
    } else if (method === 'fixedpoint') {
      theadHtml = `
        <tr>
          <th>Iter (k)</th>
          <th>x<sub>k</sub></th>
          <th>g(x<sub>k</sub>) &rarr; x<sub>k+1</sub></th>
          <th>Abs Error (E<sub>a</sub>)</th>
          <th>Rel Error (&epsilon;<sub>a</sub>)</th>
        </tr>
      `;
    } else if (method === 'jacobi' || method === 'gaussseidel') {
      const dim = (result.rows[0] && result.rows[0].x) ? result.rows[0].x.length : 2;
      let varHeaders = '';
      for (let j = 0; j < dim; j++) {
        varHeaders += `<th>x<sub>${j + 1}</sub></th>`;
      }
      theadHtml = `
        <tr>
          <th>Iter (k)</th>
          ${varHeaders}
          <th>Residual ||r||<sub>&infin;</sub></th>
          <th>Max Abs Error (E<sub>a</sub>)</th>
          <th>Max Rel Error (&epsilon;<sub>a</sub>)</th>
        </tr>
      `;
    }
    el.iterationTableHead.innerHTML = theadHtml;

    let tbodyHtml = '';
    const n = result.rows.length;

    result.rows.forEach((r, idx) => {
      const isLast = idx === n - 1;
      const stopTag = isLast && result.converged ? `<span class="stop-tag">&larr; [STOP]</span>` : '';

      if (method === 'bisection') {
        tbodyHtml += `
          <tr data-iter="${r.iteration}" class="${isLast ? 'row-stopped' : ''}">
            <td>${r.iteration}${stopTag}</td>
            <td class="font-mono">${fmtVal(r.a, 8)}</td>
            <td class="font-mono">${fmtVal(r.b, 8)}</td>
            <td class="font-mono font-bold">${fmtVal(r.c, 8)}</td>
            <td class="font-mono">${fmtVal(r.fVal, 6)}</td>
            <td class="font-mono">${fmtError(r.ea)}</td>
            <td class="font-mono">${fmtRelError(r.relEa)}</td>
          </tr>
        `;
      } else if (method === 'secant') {
        tbodyHtml += `
          <tr data-iter="${r.iteration}" class="${isLast ? 'row-stopped' : ''}">
            <td>${r.iteration}${stopTag}</td>
            <td class="font-mono">${fmtVal(r.p0, 8)}</td>
            <td class="font-mono">${fmtVal(r.p1, 8)}</td>
            <td class="font-mono font-bold">${fmtVal(r.p2, 8)}</td>
            <td class="font-mono">${fmtVal(r.fVal, 6)}</td>
            <td class="font-mono">${fmtError(r.ea)}</td>
            <td class="font-mono">${fmtRelError(r.relEa)}</td>
          </tr>
        `;
      } else if (method === 'newton') {
        tbodyHtml += `
          <tr data-iter="${r.iteration}" class="${isLast ? 'row-stopped' : ''}">
            <td>${r.iteration}${stopTag}</td>
            <td class="font-mono font-bold">${fmtVal(r.xn, 8)}</td>
            <td class="font-mono">${fmtVal(r.fVal, 6)}</td>
            <td class="font-mono">${fmtVal(r.dfVal, 6)}</td>
            <td class="font-mono">${fmtError(r.ea)}</td>
            <td class="font-mono">${fmtRelError(r.relEa)}</td>
          </tr>
        `;
      } else if (method === 'fixedpoint') {
        tbodyHtml += `
          <tr data-iter="${r.iteration}" class="${isLast ? 'row-stopped' : ''}">
            <td>${r.iteration}${stopTag}</td>
            <td class="font-mono font-bold">${fmtVal(r.xk, 8)}</td>
            <td class="font-mono font-bold" style="color:var(--primary);">${fmtVal(r.gx, 8)}</td>
            <td class="font-mono">${fmtError(r.ea)}</td>
            <td class="font-mono">${fmtRelError(r.relEa)}</td>
          </tr>
        `;
      } else if (method === 'jacobi' || method === 'gaussseidel') {
        let varCols = '';
        if (r.x) {
          r.x.forEach(val => {
            varCols += `<td class="font-mono font-bold">${fmtVal(val, 8)}</td>`;
          });
        }
        tbodyHtml += `
          <tr data-iter="${r.iteration}" class="${isLast ? 'row-stopped' : ''}">
            <td>${r.iteration}${stopTag}</td>
            ${varCols}
            <td class="font-mono">${isFinite(r.fVal) ? r.fVal.toExponential(3) : '—'}</td>
            <td class="font-mono">${fmtError(r.ea)}</td>
            <td class="font-mono">${fmtRelError(r.relEa)}</td>
          </tr>
        `;
      }
    });

    el.iterationTableBody.innerHTML = tbodyHtml;

    // Attach row click to jump to step
    const rows = el.iterationTableBody.querySelectorAll('tr');
    rows.forEach(tr => {
      tr.addEventListener('click', () => {
        const iter = parseInt(tr.dataset.iter, 10);
        state.setStep(iter);
      });
    });
  }

  function highlightTableRow(step) {
    const rows = el.iterationTableBody.querySelectorAll('tr');
    rows.forEach(tr => {
      const iter = parseInt(tr.dataset.iter, 10);
      tr.classList.toggle('row-active', iter === step);
    });
  }

  function initTableExport() {
    el.btnCopyTable.addEventListener('click', () => {
      const table = document.getElementById('iteration-table');
      if (!table) return;
      let text = '';
      table.querySelectorAll('tr').forEach(row => {
        const cols = Array.from(row.querySelectorAll('th, td')).map(td => td.innerText.replace(/\s+/g, ' ').trim());
        text += cols.join('\t') + '\n';
      });

      navigator.clipboard.writeText(text).then(() => {
        const orig = el.btnCopyTable.innerHTML;
        el.btnCopyTable.innerHTML = `<span>Copied! &check;</span>`;
        setTimeout(() => { el.btnCopyTable.innerHTML = orig; }, 1800);
      });
    });

    el.btnExportCsv.addEventListener('click', () => {
      const result = state.currentResult;
      if (!result || !result.rows || result.rows.length === 0) return;

      let csv = '';
      if (state.method === 'bisection') {
        csv += 'Iteration,Lower_a,Upper_b,Midpoint_c,f_c,Abs_Error_Ea,Rel_Error_ea_pct\n';
        result.rows.forEach(r => {
          csv += `${r.iteration},${r.a},${r.b},${r.c},${r.fVal},${r.ea ?? ''},${r.relEa !== null ? r.relEa * 100 : ''}\n`;
        });
      } else if (state.method === 'secant') {
        csv += 'Iteration,x_prev,x_curr,x_next,f_next,Abs_Error_Ea,Rel_Error_ea_pct\n';
        result.rows.forEach(r => {
          csv += `${r.iteration},${r.p0},${r.p1},${r.p2},${r.fVal},${r.ea ?? ''},${r.relEa !== null ? r.relEa * 100 : ''}\n`;
        });
      } else if (state.method === 'newton') {
        csv += 'Iteration,x_curr,f_x,df_x,Abs_Error_Ea,Rel_Error_ea_pct\n';
        result.rows.forEach(r => {
          csv += `${r.iteration},${r.xn},${r.fVal},${r.dfVal},${r.ea ?? ''},${r.relEa !== null ? r.relEa * 100 : ''}\n`;
        });
      } else if (state.method === 'fixedpoint') {
        csv += 'Iteration,x_k,g_xk,Abs_Error_Ea,Rel_Error_ea_pct\n';
        result.rows.forEach(r => {
          csv += `${r.iteration},${r.xk},${r.gx},${r.ea ?? ''},${r.relEa !== null ? r.relEa * 100 : ''}\n`;
        });
      } else if (state.method === 'jacobi' || state.method === 'gaussseidel') {
        const dim = (result.rows[0] && result.rows[0].x) ? result.rows[0].x.length : 2;
        let header = 'Iteration';
        for (let j = 0; j < dim; j++) header += `,x${j + 1}`;
        header += ',Residual_Norm,Max_Abs_Error_Ea,Max_Rel_Error_ea_pct\n';
        csv += header;
        result.rows.forEach(r => {
          let line = `${r.iteration}`;
          if (r.x) {
            r.x.forEach(val => { line += `,${val}`; });
          }
          line += `,${r.fVal},${r.ea ?? ''},${r.relEa !== null ? r.relEa * 100 : ''}\n`;
          csv += line;
        });
      }

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rootfinder_${state.method}_results.csv`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  /* ==========================================================================
     10. METHOD EXECUTION & SHOOTOUT ENGINE
     ========================================================================== */

  function updateMetrics(result) {
    if (!result || !result.converged || result.rows.length === 0) {
      el.metricRoot.textContent = '—';
      el.metricFVal.textContent = 'f(x*) = —';
      el.metricIters.textContent = '—';
      el.metricMethodName.textContent = `Method: ${state.method}`;
      el.metricRelEa.textContent = '—';
      el.metricAbsEa.textContent = 'E_a = —';
      el.metricExactErr.textContent = '—';
      el.metricExactRel.textContent = 'ε_t = —';
      return;
    }

    if (result.isLinearSystem) {
      const lastRow = result.rows[result.rows.length - 1];
      const vecStr = '[' + (result.solutionVector ? result.solutionVector.map(v => fmtVal(v, 4)).join(', ') : '') + ']';
      el.metricRoot.textContent = vecStr;
      el.metricFVal.textContent = `||Ax - b||∞ = ${isFinite(result.residualNorm) ? result.residualNorm.toExponential(4) : '—'}`;
      el.metricIters.textContent = result.iterations.toString();
      el.metricMethodName.textContent = `Method: ${state.method.toUpperCase()}`;
      el.metricRelEa.textContent = fmtRelError(lastRow.relEa);
      el.metricAbsEa.textContent = `Max Ea = ${fmtError(lastRow.ea)}`;
      el.metricExactErr.textContent = result.diagonallyDominant ? 'Diagonally Dominant' : 'Not Dominant';
      el.metricExactRel.textContent = result.converged ? 'Converged' : 'Diverged';
      return;
    }

    if (state.method === 'fixedpoint') {
      const lastRow = result.rows[result.rows.length - 1];
      const root = result.root;
      el.metricRoot.textContent = fmtVal(root, 8);
      el.metricFVal.textContent = `g(x*) = ${fmtVal(root, 6)}`;
      el.metricIters.textContent = result.iterations.toString();
      el.metricMethodName.textContent = `Method: FIXED-POINT`;
      el.metricRelEa.textContent = fmtRelError(lastRow.relEa);
      el.metricAbsEa.textContent = `E_a = ${fmtError(lastRow.ea)}`;

      if (state.trueRoot !== null && isFinite(state.trueRoot)) {
        const et = Math.abs(state.trueRoot - root);
        const relEt = Math.abs(state.trueRoot) > 1e-15 ? (et / Math.abs(state.trueRoot)) : 0;
        el.metricExactErr.textContent = fmtError(et);
        el.metricExactRel.textContent = `ε_t = ${(relEt * 100).toFixed(4)}%`;
      } else {
        el.metricExactErr.textContent = 'N/A';
        el.metricExactRel.textContent = 'Enter true root';
      }
      return;
    }

    const lastRow = result.rows[result.rows.length - 1];
    const root = result.root;

    el.metricRoot.textContent = fmtVal(root, 8);
    try {
      el.metricFVal.textContent = `f(x*) = ${fmtVal(state.f(root), 6)}`;
    } catch (e) {
      el.metricFVal.textContent = `f(x*) = —`;
    }

    el.metricIters.textContent = result.iterations.toString();
    el.metricMethodName.textContent = `Method: ${state.method.toUpperCase()}`;

    el.metricRelEa.textContent = fmtRelError(lastRow.relEa);
    el.metricAbsEa.textContent = `E_a = ${fmtError(lastRow.ea)}`;

    // Exact theoretical errors if true root is supplied
    if (state.trueRoot !== null && isFinite(state.trueRoot)) {
      const et = Math.abs(state.trueRoot - root);
      const relEt = Math.abs(state.trueRoot) > 1e-15 ? (et / Math.abs(state.trueRoot)) : 0;
      el.metricExactErr.textContent = fmtError(et);
      el.metricExactRel.textContent = `ε_t = ${(relEt * 100).toFixed(4)}%`;
    } else {
      el.metricExactErr.textContent = 'N/A';
      el.metricExactRel.textContent = 'Enter true root';
    }
  }

  /* ==========================================================================
     9B. LINEAR SYSTEM MATRIX UI CONTROLLER
     ========================================================================== */

  function renderMatrixInputs() {
    if (!el.matrixEditor || !el.initialGuessVector) return;
    const dim = state.linearSystem.dim;
    const A = state.linearSystem.A;
    const b = state.linearSystem.b;
    const x0 = state.linearSystem.x0;

    let gridHtml = '';
    for (let i = 0; i < dim; i++) {
      gridHtml += `<div class="matrix-row" data-row="${i}">`;
      for (let j = 0; j < dim; j++) {
        const val = (A[i] && A[i][j] !== undefined) ? A[i][j] : (i === j ? 4 : 0);
        gridHtml += `
          <div class="matrix-cell-wrapper">
            <input type="number" step="any" class="input-control matrix-input" data-row="${i}" data-col="${j}" value="${val}" aria-label="A[${i+1},${j+1}]">
            <span class="matrix-var-label">x<sub>${j + 1}</sub></span>
            ${j < dim - 1 ? '<span class="matrix-op">+</span>' : '<span class="matrix-op">=</span>'}
          </div>
        `;
      }
      const bVal = (b && b[i] !== undefined) ? b[i] : 1;
      gridHtml += `
        <div class="matrix-cell-wrapper">
          <input type="number" step="any" class="input-control matrix-input matrix-b-input" data-row="${i}" data-type="b" value="${bVal}" aria-label="b[${i+1}]">
        </div>
      `;
      gridHtml += `</div>`;
    }
    el.matrixEditor.innerHTML = gridHtml;

    let vecHtml = '';
    for (let j = 0; j < dim; j++) {
      const val = (x0 && x0[j] !== undefined) ? x0[j] : 0;
      vecHtml += `
        <div class="vector-cell-item">
          <span class="matrix-var-label">x<sub>${j + 1}</sub><sup>(0)</sup>:</span>
          <input type="number" step="any" class="input-control matrix-input vector-x0-input" data-index="${j}" value="${val}" aria-label="Initial guess x${j+1}">
        </div>
      `;
    }
    el.initialGuessVector.innerHTML = vecHtml;

    // Attach real-time input change handlers
    el.matrixEditor.querySelectorAll('.matrix-input').forEach(inp => {
      inp.addEventListener('input', () => {
        readMatrixInputs();
        updateDiagonalDominanceBadge(state.linearSystem.A);
        runSolver();
      });
    });

    el.initialGuessVector.querySelectorAll('.vector-x0-input').forEach(inp => {
      inp.addEventListener('input', () => {
        readMatrixInputs();
        runSolver();
      });
    });

    updateDiagonalDominanceBadge(state.linearSystem.A);
  }

  function readMatrixInputs() {
    if (!el.matrixEditor || !el.initialGuessVector) return state.linearSystem;
    const dim = state.linearSystem.dim;
    const A = [];
    const b = [];
    const x0 = [];

    for (let i = 0; i < dim; i++) {
      A[i] = [];
      for (let j = 0; j < dim; j++) {
        const inp = el.matrixEditor.querySelector(`.matrix-input[data-row="${i}"][data-col="${j}"]`);
        A[i][j] = inp ? parseFloat(inp.value) || 0 : 0;
      }
      const bInp = el.matrixEditor.querySelector(`.matrix-b-input[data-row="${i}"]`);
      b[i] = bInp ? parseFloat(bInp.value) || 0 : 0;
    }

    for (let j = 0; j < dim; j++) {
      const x0Inp = el.initialGuessVector.querySelector(`.vector-x0-input[data-index="${j}"]`);
      x0[j] = x0Inp ? parseFloat(x0Inp.value) || 0 : 0;
    }

    state.linearSystem.A = A;
    state.linearSystem.b = b;
    state.linearSystem.x0 = x0;
    return { A, b, x0 };
  }

  function updateDiagonalDominanceBadge(A) {
    if (!el.diagonalDominanceBadge) return;
    const isDom = checkDiagonalDominance(A);
    if (isDom) {
      el.diagonalDominanceBadge.className = 'badge-status success';
      el.diagonalDominanceBadge.innerHTML = '<span>Strictly Diagonally Dominant &check; Guaranteed Convergence</span>';
    } else {
      el.diagonalDominanceBadge.className = 'badge-status warning';
      el.diagonalDominanceBadge.innerHTML = '<span>Not Diagonally Dominant &bull; Try "Auto-Pivot" to guarantee convergence</span>';
    }
  }

  function adjustLinearSystemDim(newDim) {
    if (newDim < 2 || newDim > 4) return;
    state.linearSystem.dim = newDim;

    const defaultSystems = {
      2: {
        A: [[3, 1], [1, 2]],
        b: [9, 8],
        x0: [0, 0]
      },
      3: {
        A: [[4, -1, 1], [4, -8, 1], [-2, 1, 5]],
        b: [7, -21, 15],
        x0: [0, 0, 0]
      },
      4: {
        A: [[10, -1, 2, 0], [-1, 11, -1, 3], [2, -1, 10, -1], [0, 3, -1, 8]],
        b: [6, 25, -11, 15],
        x0: [0, 0, 0, 0]
      }
    };

    const def = defaultSystems[newDim] || defaultSystems[3];
    state.linearSystem.A = def.A.map(r => [...r]);
    state.linearSystem.b = [...def.b];
    state.linearSystem.x0 = [...def.x0];

    el.dimPills.forEach(pill => {
      const pDim = parseInt(pill.dataset.dim, 10);
      pill.classList.toggle('active', pDim === newDim);
    });

    renderMatrixInputs();
    runSolver();
  }

  function triggerAutoPivot() {
    readMatrixInputs();
    const { A, b } = autoPivotMatrix(state.linearSystem.A, state.linearSystem.b);
    state.linearSystem.A = A;
    state.linearSystem.b = b;
    renderMatrixInputs();
    runSolver(true);
  }

  function runSolver(autoPlay = false) {
    el.solverAlert.style.display = 'none';
    if (state.pause) state.pause();

    // 1. Solve Linear System (Jacobi or Gauss-Seidel)
    const isLinear = state.method === 'jacobi' || state.method === 'gaussseidel';
    if (isLinear) {
      state.tol = parseTolerance(el.inputTol.value);
      state.maxIter = parseInt(el.inputMaxIter.value, 10) || 100;

      readMatrixInputs();
      const A = state.linearSystem.A;
      const b = state.linearSystem.b;
      const x0 = state.linearSystem.x0;

      let result = null;
      if (state.method === 'jacobi') {
        result = solveJacobi(A, b, x0, state.tol, state.maxIter);
      } else {
        result = solveGaussSeidel(A, b, x0, state.tol, state.maxIter);
      }

      if (result.errorMsg) {
        showAlert(result.errorMsg);
      }

      state.currentResult = result;

      if (result && result.rows.length > 0) {
        if (el.stepSlider) {
          el.stepSlider.min = 1;
          el.stepSlider.max = result.rows.length;
          el.stepSlider.value = result.rows.length;
        }
        if (el.fsStepSlider) {
          el.fsStepSlider.min = 1;
          el.fsStepSlider.max = result.rows.length;
          el.fsStepSlider.value = result.rows.length;
        }
        state.playback.currentStep = result.rows.length;

        // Auto frame phase plane or component plot
        if (state.linearSystem.dim === 2) {
          const solX = result.solutionVector[0];
          const solY = result.solutionVector[1];
          const span = Math.max(Math.abs(solX - x0[0]), Math.abs(solY - x0[1]), 3);
          state.view.origXMin = solX - span * 1.5;
          state.view.origXMax = solX + span * 1.5;
          state.view.origYMin = solY - span * 1.5;
          state.view.origYMax = solY + span * 1.5;
          state.view.xMin = state.view.origXMin;
          state.view.xMax = state.view.origXMax;
          state.view.yMin = state.view.origYMin;
          state.view.yMax = state.view.origYMax;
        } else {
          state.view.origXMin = 0;
          state.view.origXMax = Math.max(result.rows.length, 5);
          const allVals = [];
          result.rows.forEach(r => { if (r.x) allVals.push(...r.x); });
          const minVal = allVals.length > 0 ? Math.min(...allVals) : 0;
          const maxVal = allVals.length > 0 ? Math.max(...allVals) : 1;
          const vSpan = Math.max(Math.abs(maxVal - minVal), 1.0);
          state.view.origYMin = minVal - vSpan * 0.25;
          state.view.origYMax = maxVal + vSpan * 0.25;
          state.view.xMin = state.view.origXMin;
          state.view.xMax = state.view.origXMax;
          state.view.yMin = state.view.origYMin;
          state.view.yMax = state.view.origYMax;
        }

        updateMetrics(result);
        renderTable(result, state.method);

        if (autoPlay && result.rows.length > 1) {
          state.playback.currentStep = 1;
          state.setStep(1, false);
          if (state.play) state.play();
        } else {
          state.playback.currentStep = result.rows.length;
          state.setStep(result.rows.length);
        }
      }
      return;
    }

    // 2. Solve Fixed-Point Iteration (x = g(x))
    if (state.method === 'fixedpoint') {
      const rawGx = el.inputFixedGx ? el.inputFixedGx.value.trim() : '';
      if (!rawGx) {
        showAlert("Please enter an iteration function g(x) for x = g(x).");
        return;
      }
      try {
        state.fixedPoint.g = MathParser.compile(rawGx);
        state.fixedPoint.gxString = rawGx;
      } catch (err) {
        showAlert(`Syntax / Math Error in g(x): ${err.message}`);
        return;
      }

      // Automatically construct equivalent root function f(x) = x - g(x) for residual check
      state.f = (x) => x - state.fixedPoint.g(x);

      state.tol = parseTolerance(el.inputTol.value);
      state.maxIter = parseInt(el.inputMaxIter.value, 10) || 100;
      const x0 = el.inputFixedX0 ? parseFloat(el.inputFixedX0.value) : 0.5;
      if (isNaN(x0)) {
        showAlert("Please enter a valid number for initial guess x₀.");
        return;
      }

      const trueRootStr = el.inputTrueRoot.value.trim();
      if (trueRootStr) {
        try {
          const rootFn = MathParser.compile(trueRootStr);
          state.trueRoot = rootFn(0);
        } catch (e) {
          state.trueRoot = parseFloat(trueRootStr);
        }
      } else {
        state.trueRoot = null;
      }

      const result = solveFixedPoint(state.fixedPoint.g, x0, state.tol, state.maxIter, state.f);
      if (result.errorMsg) {
        showAlert(result.errorMsg);
      }

      state.currentResult = result;

      if (result && result.rows.length > 0) {
        if (el.stepSlider) {
          el.stepSlider.min = 1;
          el.stepSlider.max = result.rows.length;
          el.stepSlider.value = result.rows.length;
        }
        if (el.fsStepSlider) {
          el.fsStepSlider.min = 1;
          el.fsStepSlider.max = result.rows.length;
          el.fsStepSlider.value = result.rows.length;
        }
        state.playback.currentStep = result.rows.length;

        const fitA = Math.min(x0, result.root) - 1.5;
        const fitB = Math.max(x0, result.root) + 1.5;
        state.autoFitView(fitA, fitB, result.root);

        updateMetrics(result);
        renderTable(result, state.method);

        if (autoPlay && result.rows.length > 1) {
          state.playback.currentStep = 1;
          state.setStep(1, false);
          if (state.play) state.play();
        } else {
          state.playback.currentStep = result.rows.length;
          state.setStep(result.rows.length);
        }
      }
      return;
    }

    // 3. Solve 1D Root-Finding (Bisection, Secant, Newton-Raphson)
    const rawFunc = el.inputFunc.value.trim();
    if (!rawFunc) {
      showAlert("Please enter a mathematical function f(x).");
      return;
    }

    try {
      state.f = MathParser.compile(rawFunc);
      let valid = false;
      for (const tx of [1.0, 0.5, 2.0, 0.0, -1.0]) {
        try {
          const v = state.f(tx);
          if (isFinite(v)) { valid = true; break; }
        } catch (e) {}
      }
      if (!valid) throw new Error("Function returned invalid values or could not be evaluated.");
    } catch (err) {
      showAlert(`Syntax / Math Error: ${err.message}`);
      return;
    }

    state.tol = parseTolerance(el.inputTol.value);
    state.maxIter = parseInt(el.inputMaxIter.value, 10) || 100;

    const trueRootStr = el.inputTrueRoot.value.trim();
    if (trueRootStr) {
      try {
        const rootFn = MathParser.compile(trueRootStr);
        state.trueRoot = rootFn(0);
      } catch (e) {
        state.trueRoot = parseFloat(trueRootStr);
      }
    } else {
      state.trueRoot = null;
    }

    let result = null;
    if (state.method === 'bisection') {
      const a = parseFloat(el.inputBisA.value);
      const b = parseFloat(el.inputBisB.value);
      if (isNaN(a) || isNaN(b)) {
        showAlert("Please enter valid numbers for lower bound (a) and upper bound (b).");
        return;
      }
      result = solveBisection(state.f, a, b, state.tol, state.maxIter);
      if (result.errorMsg) showAlert(result.errorMsg);
    } else if (state.method === 'secant') {
      const x0 = parseFloat(el.inputSecX0.value);
      const x1 = parseFloat(el.inputSecX1.value);
      if (isNaN(x0) || isNaN(x1)) {
        showAlert("Please enter valid numbers for initial guesses x₀ and x₁.");
        return;
      }
      result = solveSecant(state.f, x0, x1, state.tol, state.maxIter);
      if (result.errorMsg) showAlert(result.errorMsg);
    } else if (state.method === 'newton') {
      const x0 = parseFloat(el.inputNewtonX0.value);
      if (isNaN(x0)) {
        showAlert("Please enter a valid number for initial guess x₀.");
        return;
      }
      result = solveNewton(state.f, x0, state.tol, state.maxIter);
      if (result.errorMsg) showAlert(result.errorMsg);
    }

    state.currentResult = result;

    if (result && result.rows.length > 0) {
      if (el.stepSlider) {
        el.stepSlider.min = 1;
        el.stepSlider.max = result.rows.length;
        el.stepSlider.value = result.rows.length;
      }
      if (el.fsStepSlider) {
        el.fsStepSlider.min = 1;
        el.fsStepSlider.max = result.rows.length;
        el.fsStepSlider.value = result.rows.length;
      }
      state.playback.currentStep = result.rows.length;

      let fitA = 0, fitB = 1;
      if (state.method === 'bisection') {
        fitA = parseFloat(el.inputBisA.value);
        fitB = parseFloat(el.inputBisB.value);
      } else if (state.method === 'secant') {
        fitA = parseFloat(el.inputSecX0.value);
        fitB = parseFloat(el.inputSecX1.value);
      } else {
        fitA = parseFloat(el.inputNewtonX0.value) - 1;
        fitB = parseFloat(el.inputNewtonX0.value) + 1;
      }
      state.autoFitView(fitA, fitB, result.root);

      updateMetrics(result);
      renderTable(result, state.method);

      if (autoPlay && result.rows.length > 1) {
        state.playback.currentStep = 1;
        state.setStep(1, false);
        if (state.play) state.play();
      } else {
        state.playback.currentStep = result.rows.length;
        state.setStep(result.rows.length);
      }
    }
  }

  function runShootout() {
    const isLinear = state.method === 'jacobi' || state.method === 'gaussseidel';

    if (isLinear) {
      readMatrixInputs();
      switchView('shootout');

      const A = state.linearSystem.A;
      const b = state.linearSystem.b;
      const x0 = state.linearSystem.x0;

      const resJ = solveJacobi(A, b, x0, state.tol, state.maxIter);
      const resGS = solveGaussSeidel(A, b, x0, state.tol, state.maxIter);

      state.shootoutResults = {
        isLinear: true,
        jacobi: resJ,
        gaussseidel: resGS
      };

      const linearMethodsMeta = [
        { name: 'Jacobi Iteration', res: resJ, desc: 'Simultaneous displacements: x⁽ᵏ⁺¹⁾ = D⁻¹(b - (L+U)x⁽ᵏ⁾)', rate: 'Linear, Spectral Radius ρ(T_J)' },
        { name: 'Gauss-Seidel', res: resGS, desc: 'Successive displacements: x⁽ᵏ⁺¹⁾ = (D-L)⁻¹(Ux⁽ᵏ⁾ + b)', rate: 'Typically 2× faster (ρ(T_GS) ≈ ρ(T_J)²)' }
      ];

      let html = '';
      linearMethodsMeta.forEach(m => {
        const ok = m.res && m.res.converged;
        const iters = m.res ? m.res.iterations : 'Failed';
        const solStr = m.res && m.res.solutionVector ? '[' + m.res.solutionVector.map(v => fmtVal(v, 4)).join(', ') + ']' : '—';
        const lastErr = m.res && m.res.rows.length > 0 ? fmtRelError(m.res.rows[m.res.rows.length - 1].relEa) : '—';
        const statusBadge = ok ?
          '<span class="badge" style="background:var(--success-subtle);color:var(--success)">Converged &check;</span>' :
          '<span class="badge" style="background:var(--danger-subtle);color:var(--danger)">Error / Diverged</span>';

        html += `
          <tr>
            <td><strong>${m.name}</strong></td>
            <td><small class="text-muted">${m.desc}</small></td>
            <td>${iters}</td>
            <td class="font-mono">${solStr}</td>
            <td>${lastErr}</td>
            <td>${m.rate}</td>
            <td>${statusBadge}</td>
          </tr>
        `;
      });

      el.shootoutTableBody.innerHTML = html;
      renderShootoutCanvas();
      return;
    }

    if (!state.f) runSolver();
    if (!state.f) return;

    // Switch to Shootout view tab
    switchView('shootout');

    // Run root-finding methods
    const a = parseFloat(el.inputBisA.value) || 0;
    const b = parseFloat(el.inputBisB.value) || 1;
    const x0 = parseFloat(el.inputSecX0.value) || a;
    const x1 = parseFloat(el.inputSecX1.value) || b;
    const n0 = parseFloat(el.inputNewtonX0.value) || (a + b) / 2;

    const resBis = solveBisection(state.f, a, b, state.tol, state.maxIter);
    const resSec = solveSecant(state.f, x0, x1, state.tol, state.maxIter);
    const resNew = solveNewton(state.f, n0, state.tol, state.maxIter);

    let resFp = null;
    if (state.fixedPoint && state.fixedPoint.g) {
      const fpX0 = el.inputFixedX0 ? parseFloat(el.inputFixedX0.value) : 0.5;
      resFp = solveFixedPoint(state.fixedPoint.g, isNaN(fpX0) ? 0.5 : fpX0, state.tol, state.maxIter, state.f);
    }

    state.shootoutResults = {
      isLinear: false,
      bisection: resBis,
      secant: resSec,
      newton: resNew,
      fixedpoint: resFp
    };

    // Populate comparison table
    const methodsMeta = [
      { name: 'Bisection Method', res: resBis, rate: 'Linear (p = 1.0)', inputs: `[${fmtVal(a)}, ${fmtVal(b)}]` },
      { name: 'Secant Method', res: resSec, rate: 'Superlinear (p ≈ 1.62)', inputs: `x₀=${fmtVal(x0)}, x₁=${fmtVal(x1)}` },
      { name: 'Newton-Raphson', res: resNew, rate: 'Quadratic (p = 2.0)', inputs: `x₀=${fmtVal(n0)}` },
      ...(resFp ? [{ name: 'Fixed-Point Iteration', res: resFp, rate: 'Linear (p = 1.0, |g\'| < 1)', inputs: `x₀=${fmtVal(el.inputFixedX0 ? parseFloat(el.inputFixedX0.value) : 0.5)}` }] : [])
    ];

    let html = '';
    methodsMeta.forEach(m => {
      const ok = m.res && m.res.converged;
      const iters = m.res ? m.res.iterations : 'Failed';
      const root = m.res && m.res.root !== null ? fmtVal(m.res.root, 8) : '—';
      const lastErr = m.res && m.res.rows.length > 0 ? fmtRelError(m.res.rows[m.res.rows.length - 1].relEa) : '—';
      const statusBadge = ok ?
        '<span class="badge" style="background:var(--success-subtle);color:var(--success)">Converged &check;</span>' :
        '<span class="badge" style="background:var(--danger-subtle);color:var(--danger)">Error / Diverged</span>';

      html += `
        <tr>
          <td><strong>${m.name}</strong></td>
          <td>${m.inputs}</td>
          <td>${iters}</td>
          <td>${root}</td>
          <td>${lastErr}</td>
          <td>${m.rate}</td>
          <td>${statusBadge}</td>
        </tr>
      `;
    });

    el.shootoutTableBody.innerHTML = html;
    renderShootoutCanvas();
  }

  function showAlert(msg) {
    el.solverAlert.style.display = 'flex';
    el.solverAlert.className = 'alert-box danger';
    el.solverAlert.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <div>${msg}</div>
    `;
  }

  /* ==========================================================================
     11. AUTO-SCANNER & PRESETS INTEGRATION
     ========================================================================== */

  function initScanner() {
    el.btnScanRoots.addEventListener('click', () => {
      const raw = el.inputFunc.value.trim();
      if (!raw) return;

      try {
        const fn = MathParser.compile(raw);
        const brackets = findBrackets(fn, -10, 10, 200);

        if (brackets.length === 0) {
          el.scannerSummaryText.textContent = 'No sign-change brackets found in [-10, 10]. Function might have only complex roots or no zeros.';
          el.bracketPillsList.innerHTML = '<span class="text-muted text-sm">Try widening function range or inspecting curve.</span>';
        } else {
          el.scannerSummaryText.textContent = `Discovered ${brackets.length} root bracket(s) in domain [-10, 10]:`;
          let html = '';
          brackets.forEach(b => {
            html += `<button type="button" class="bracket-pill" data-a="${b.a}" data-b="${b.b}">[${b.a}, ${b.b}]</button>`;
          });
          el.bracketPillsList.innerHTML = html;

          // Auto-apply the first or smallest positive bracket
          const pos = brackets.find(b => (b.a + b.b) / 2 >= 0) || brackets[0];
          applyBracket(pos.a, pos.b);
        }

        el.scannerCard.style.display = 'block';

        // Add pill click events
        el.bracketPillsList.querySelectorAll('.bracket-pill').forEach(pill => {
          pill.addEventListener('click', () => {
            const a = parseFloat(pill.dataset.a);
            const b = parseFloat(pill.dataset.b);
            applyBracket(a, b);
          });
        });
      } catch (err) {
        showAlert(`Scanner Error: ${err.message}`);
      }
    });

    el.btnCloseScanner.addEventListener('click', () => {
      el.scannerCard.style.display = 'none';
    });

    function applyBracket(a, b) {
      el.inputBisA.value = a;
      el.inputBisB.value = b;
      el.inputSecX0.value = a;
      el.inputSecX1.value = b;
      el.inputNewtonX0.value = cleanNum((a + b) / 2);
      checkBolzanoBadge();
      runSolver(true);
    }
  }

  function checkBolzanoBadge() {
    if (state.method !== 'bisection') return;
    const a = parseFloat(el.inputBisA.value);
    const b = parseFloat(el.inputBisB.value);
    if (isNaN(a) || isNaN(b) || !state.f) {
      el.bolzanoBadge.style.display = 'none';
      return;
    }

    try {
      const fa = state.f(a);
      const fb = state.f(b);
      el.bolzanoBadge.style.display = 'flex';
      if (fa * fb <= 0) {
        el.bolzanoBadge.className = 'badge-status success';
        el.bolzanoBadge.innerHTML = `<span>Bolzano: f(${a})=${fmtVal(fa)}, f(${b})=${fmtVal(fb)} (Sign Change &check;)</span>`;
      } else {
        el.bolzanoBadge.className = 'badge-status danger';
        el.bolzanoBadge.innerHTML = `<span>Bolzano Violated: f(${a})=${fmtVal(fa)} and f(${b})=${fmtVal(fb)} have the SAME sign!</span>`;
      }
    } catch (e) {
      el.bolzanoBadge.style.display = 'none';
    }
  }

  const PRESETS = {
    cubic: {
      type: 'root',
      func: 'x^3 - 7x + 1',
      a: 0, b: 1, x0: 0, x1: 1, n0: 0.5,
      trueRoot: '0.14373989',
      tol: '0.0001%'
    },
    transcendental: {
      type: 'root',
      func: 'x^3 - x - 11',
      a: 2, b: 3, x0: 2, x1: 3, n0: 2.5,
      trueRoot: '2.3736498',
      tol: '0.05%'
    },
    trig: {
      type: 'root',
      func: 'cos(x) - x',
      a: 0, b: 1, x0: 0, x1: 1, n0: 0.5,
      trueRoot: '0.739085133',
      tol: '0.0001%'
    },
    exp: {
      type: 'root',
      func: 'e^x - 3x',
      a: 0, b: 1, x0: 0, x1: 1, n0: 0.6,
      trueRoot: '0.61906129',
      tol: '0.0001%'
    },
    poly4: {
      type: 'root',
      func: 'x^4 - 2x^3 - 4x^2 + 4x + 4',
      a: 0, b: 2, x0: 0, x1: 2, n0: 1.5,
      trueRoot: '1.41421356',
      tol: '0.0001%'
    },
    sqrt2: {
      type: 'root',
      func: 'x^2 - 2',
      a: 1, b: 2, x0: 1, x1: 2, n0: 1.5,
      trueRoot: '1.41421356',
      tol: '0.0001%'
    },
    fp_cubic: {
      type: 'fixedpoint',
      method: 'fixedpoint',
      gx: '(x^3 + 1) / 7',
      x0: 0.5,
      trueRoot: '0.14373989',
      tol: '0.0001%'
    },
    fp_cos: {
      type: 'fixedpoint',
      method: 'fixedpoint',
      gx: 'cos(x)',
      x0: 0.5,
      trueRoot: '0.739085133',
      tol: '0.0001%'
    },
    fp_exp: {
      type: 'fixedpoint',
      method: 'fixedpoint',
      gx: 'e^(-x)',
      x0: 0.5,
      trueRoot: '0.56714329',
      tol: '0.0001%'
    },
    lin_diag3: {
      type: 'linear',
      method: 'jacobi',
      dim: 3,
      A: [[4, -1, 1], [4, -8, 1], [-2, 1, 5]],
      b: [7, -21, 15],
      x0: [0, 0, 0],
      tol: '0.0001%'
    },
    lin_inter2: {
      type: 'linear',
      method: 'gaussseidel',
      dim: 2,
      A: [[3, 1], [1, 2]],
      b: [9, 8],
      x0: [0, 0],
      tol: '0.0001%'
    },
    lin_circuit3: {
      type: 'linear',
      method: 'gaussseidel',
      dim: 3,
      A: [[12, -3, -4], [-3, 15, -6], [-4, -6, 20]],
      b: [24, 0, 10],
      x0: [0, 0, 0],
      tol: '0.0001%'
    },
    lin_struct4: {
      type: 'linear',
      method: 'jacobi',
      dim: 4,
      A: [[10, -1, 2, 0], [-1, 11, -1, 3], [2, -1, 10, -1], [0, 3, -1, 8]],
      b: [6, 25, -11, 15],
      x0: [0, 0, 0, 0],
      tol: '0.0001%'
    }
  };

  function initPresets() {
    el.presetSelect.addEventListener('change', (e) => {
      const key = e.target.value;
      if (!key || !PRESETS[key]) return;
      const p = PRESETS[key];

      if (p.type === 'fixedpoint') {
        setMethod('fixedpoint');
        if (el.inputFixedGx) el.inputFixedGx.value = p.gx;
        if (el.inputFixedX0) el.inputFixedX0.value = p.x0;
        if (el.inputTol) el.inputTol.value = p.tol;
        if (el.inputTrueRoot) el.inputTrueRoot.value = p.trueRoot;
        updateFixedGxPreview();
        runSolver(true);
        return;
      }

      if (p.type === 'linear') {
        setMethod(p.method);
        state.linearSystem.dim = p.dim;
        state.linearSystem.A = p.A.map(r => [...r]);
        state.linearSystem.b = [...p.b];
        state.linearSystem.x0 = [...p.x0];
        if (el.inputTol) el.inputTol.value = p.tol;

        el.dimPills.forEach(pill => {
          const pDim = parseInt(pill.dataset.dim, 10);
          pill.classList.toggle('active', pDim === p.dim);
        });

        renderMatrixInputs();
        runSolver(true);
        return;
      }

      // Root finding preset
      if (state.method === 'jacobi' || state.method === 'gaussseidel') {
        setMethod('bisection');
      }
      el.inputFunc.value = p.func;
      el.inputBisA.value = p.a;
      el.inputBisB.value = p.b;
      el.inputSecX0.value = p.x0;
      el.inputSecX1.value = p.x1;
      el.inputNewtonX0.value = p.n0;
      el.inputTol.value = p.tol;
      el.inputTrueRoot.value = p.trueRoot;

      updateFuncPreview();
      runSolver(true);
    });
  }

  function updateFixedGxPreview() {
    if (!el.fixedGxPreview || !el.inputFixedGx) return;
    const raw = el.inputFixedGx.value.trim();
    if (!raw) {
      el.fixedGxPreview.textContent = 'Preview: —';
      return;
    }
    let preview = raw
      .replace(/\^3/g, '³')
      .replace(/\^2/g, '²')
      .replace(/\^4/g, '⁴')
      .replace(/\*/g, '&middot;');
    el.fixedGxPreview.innerHTML = `Preview: <em>x = g(x) = ${preview}</em>`;
  }

  function updateFuncPreview() {
    const raw = el.inputFunc.value.trim();
    if (!raw) {
      el.funcPreview.textContent = 'Preview: —';
      return;
    }
    // Simple math formatting for preview banner
    let preview = raw
      .replace(/\^3/g, '³')
      .replace(/\^2/g, '²')
      .replace(/\^4/g, '⁴')
      .replace(/\*/g, '&middot;');
    el.funcPreview.innerHTML = `Preview: <em>f(x) = ${preview}</em>`;
    checkBolzanoBadge();
  }

  /* ==========================================================================
     12. VIEW SWITCHER & MODAL HANDLER
     ========================================================================== */

  function switchView(viewName) {
    el.viewTabs.forEach(tab => {
      const active = tab.dataset.view === viewName;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
    });

    Object.keys(el.viewPanels).forEach(key => {
      const panel = el.viewPanels[key];
      if (panel) {
        panel.style.display = key === viewName ? 'block' : 'none';
      }
    });

    // Toolbar visibility for table
    el.tableActionsToolbar.style.display = viewName === 'table' ? 'flex' : 'none';

    if (viewName === 'vis') {
      renderCanvases();
    } else if (viewName === 'shootout') {
      renderShootoutCanvas();
    }
  }

  function setMethod(m) {
    state.method = m;
    el.methodTabs.forEach(t => {
      const isTarget = t.dataset.method === m;
      t.classList.toggle('active', isTarget);
      t.setAttribute('aria-selected', isTarget ? 'true' : 'false');
    });

    const isLinear = m === 'jacobi' || m === 'gaussseidel';
    const isFixedPoint = m === 'fixedpoint';

    el.inputsBisection.style.display = m === 'bisection' ? 'block' : 'none';
    el.inputsSecant.style.display = m === 'secant' ? 'block' : 'none';
    el.inputsNewton.style.display = m === 'newton' ? 'block' : 'none';
    if (el.inputsFixedPoint) el.inputsFixedPoint.style.display = isFixedPoint ? 'block' : 'none';
    if (el.inputsLinearSystem) el.inputsLinearSystem.style.display = isLinear ? 'block' : 'none';

    // Hide f(x) input for both Linear Systems and Fixed-Point (so Fixed-Point only inputs g(x))
    const hideFuncInput = isLinear || isFixedPoint;
    if (el.funcInputGroup) el.funcInputGroup.style.display = hideFuncInput ? 'none' : 'block';
    if (el.inputFunc) el.inputFunc.required = !hideFuncInput;

    const btnSpan = el.btnCalculate ? el.btnCalculate.querySelector('span') : null;
    if (btnSpan) {
      if (isLinear) {
        btnSpan.textContent = 'Solve Linear System';
      } else if (isFixedPoint) {
        btnSpan.textContent = 'Solve Fixed Point';
      } else {
        btnSpan.textContent = 'Solve Equation';
      }
    }

    if (isLinear) {
      if (el.tabShootoutTitle) el.tabShootoutTitle.textContent = 'Jacobi vs Gauss-Seidel';
      if (el.shootoutHeading) el.shootoutHeading.textContent = 'Linear System Solver Shootout: Jacobi vs Gauss-Seidel';
      if (el.shootoutSubtext) el.shootoutSubtext.textContent = 'Side-by-side iterative convergence comparison on the active system Ax = b.';
    } else {
      if (el.tabShootoutTitle) el.tabShootoutTitle.textContent = 'Method Shootout';
      if (el.shootoutHeading) el.shootoutHeading.textContent = 'Convergence Shootout (All Root-Finding Methods)';
      if (el.shootoutSubtext) el.shootoutSubtext.textContent = 'Side-by-side execution under identical tolerance and iteration limits.';
    }

    checkBolzanoBadge();
  }

  function initTabs() {
    // Method selector tabs
    el.methodTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const m = tab.dataset.method;
        setMethod(m);
        runSolver();
      });
    });

    // Dimension selector pills for linear systems
    el.dimPills.forEach(pill => {
      pill.addEventListener('click', () => {
        const dim = parseInt(pill.dataset.dim, 10);
        adjustLinearSystemDim(dim);
      });
    });

    // Auto-Pivot button
    if (el.btnAutoPivot) {
      el.btnAutoPivot.addEventListener('click', () => {
        triggerAutoPivot();
      });
    }

    // Workspace view tabs
    el.viewTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        switchView(tab.dataset.view);
      });
    });

    // Theory dialog tabs
    el.theoryTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        el.theoryTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const targetId = tab.dataset.theoryTab;
        el.theoryContents.forEach(c => {
          c.style.display = c.id === targetId ? 'block' : 'none';
        });
      });
    });

    // Theory modal open/close
    el.btnOpenTheory.addEventListener('click', () => {
      if (typeof el.theoryDialog.showModal === 'function') {
        el.theoryDialog.showModal();
      } else {
        el.theoryDialog.setAttribute('open', '');
      }
    });

    el.btnCloseTheory.addEventListener('click', () => el.theoryDialog.close());
    el.btnTheoryDone.addEventListener('click', () => el.theoryDialog.close());
    el.theoryDialog.addEventListener('click', (e) => {
      if (e.target === el.theoryDialog) el.theoryDialog.close();
    });
  }

  /* ==========================================================================
     13. INITIALIZATION
     ========================================================================== */

  function init() {
    initTheme();
    renderMatrixInputs();
    updateFixedGxPreview();
    initTabs();
    initCanvasInteractions();
    initPlayback();
    initFullscreenGraph();
    initSpanScreenWidth();
    initTableExport();
    initScanner();
    initPresets();

    el.inputFunc.addEventListener('input', updateFuncPreview);
    if (el.inputFixedGx) el.inputFixedGx.addEventListener('input', updateFixedGxPreview);
    if (el.inputFixedX0) el.inputFixedX0.addEventListener('input', () => runSolver(false));
    el.inputBisA.addEventListener('input', checkBolzanoBadge);
    el.inputBisB.addEventListener('input', checkBolzanoBadge);

    el.form.addEventListener('submit', (e) => {
      e.preventDefault();
      runSolver(true);
    });

    el.btnCompareAll.addEventListener('click', () => {
      runShootout();
    });

    window.addEventListener('resize', () => {
      renderCanvases();
    });

    // Initial solve with default equation
    updateFuncPreview();
    runSolver(false);
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
