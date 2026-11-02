# RootFinder Studio

An interactive numerical-methods application for solving nonlinear equations and
small systems of linear equations. The project includes:

- A browser application with interactive graphs, step-by-step animation,
  convergence/error plots, method comparison, and CSV export.
- A Python command-line application that prints iteration tables and saves
  publication-quality Matplotlib plots.
- Built-in theory panels and PDF learning materials.

## Supported methods

| Method | Problem type | Initial input | Main idea |
| --- | --- | --- | --- |
| **Bisection** | `f(x) = 0` | Bracket `[a, b]` | Repeatedly halves an interval containing a sign change. |
| **Secant** | `f(x) = 0` | Two guesses `x0`, `x1` | Uses a secant line instead of a derivative. |
| **Newton-Raphson** | `f(x) = 0` | One guess `x0` | Uses tangent-line iterations. |
| **Fixed-Point** | `x = g(x)` | `g(x)` and `x0` | Repeatedly evaluates `x_(k+1) = g(x_k)`. |
| **Jacobi** | `A x = b` | Matrix, RHS, initial vector | Updates all components from the previous vector. |
| **Gauss-Seidel** | `A x = b` | Matrix, RHS, initial vector | Immediately reuses newly updated components. |

The web and CLI versions stop primarily when the relative approximate error is
within the requested tolerance. They also stop when the function value is
effectively zero, or when the maximum iteration limit is reached.

## Quick start: web application

The web interface is static and needs no package installation.

### Option 1: open directly

Open `index.html` in a modern browser.

### Option 2: serve locally

Serving the files locally is recommended for consistent browser behavior:

```bash
python -m http.server 8000
```

Then open <http://localhost:8000>.

The web application is implemented by:

- `index.html` — page structure, forms, theory guide, and result panels.
- `app.js` — expression parser, numerical solvers, visualizations, and exports.
- `styles.css` — responsive layout, themes, controls, and graph styling.

## Quick start: Python CLI

The CLI requires Python 3.9+ and the `numpy` and `matplotlib` packages.

```bash
python -m venv .venv

# Linux/macOS
source .venv/bin/activate

# Windows PowerShell
.venv\Scripts\Activate.ps1

python -m pip install --upgrade pip
python -m pip install numpy matplotlib
python bisection.py
```

On Windows, the application also supports running the interpreter directly:

```powershell
.venv\Scripts\python.exe bisection.py
```

The CLI is interactive. It prints a complete iteration table, a convergence
summary, four error measurements where applicable, and optionally writes
`bisection_plot.png`.

## Mathematical expressions

For one-variable methods, enter expressions using `x`, numbers, operators
`+`, `-`, `*`, `/`, and `^` or `**`. Implicit multiplication is supported, so
`2x`, `3sin(x)`, and `(x+1)(x-1)` are accepted.

Available functions and constants include:

```text
abs, sin, cos, tan, sec, csc, cosec, cot
asin, acos, atan, sinh, cosh, tanh, sech, csch, coth
asinh, acosh, atanh, exp, log, ln, log10, log2
sqrt, cbrt, pi, e
```

Examples:

```text
x^3 - 7x + 1
cos(x) - x
sqrt(x + 2) - 1
2sin(x) - 0.5
```

Expressions are evaluated by a restricted parser/evaluator rather than by
executing arbitrary user code.

## Browser workflow

1. Select a method.
2. Enter the function, iteration function, or linear system.
3. Enter method-specific starting values.
4. Set the tolerance and maximum iterations.
5. Click **Calculate**.
6. Review the summary metrics, animated geometric visualization, error
   trajectory, and iteration table.
7. Use the table toolbar to copy results or download a CSV file.

The application also provides:

- **Preset examples** for common equations, fixed-point iterations, and
  linear systems.
- **Scan Roots** to find sign-change brackets in the default domain
  `[-10, 10]`.
- **Compare Methods** to run Bisection, Secant, and Newton-Raphson side by
  side for the same function.
- **Play/Pause and step controls** for inspecting individual iterations.
- **Pan, zoom, auto-zoom, and fullscreen** controls for graph exploration.
- **Light, dark, and system themes**.
- A built-in **Numerical Methods Handbook** opened through **Theory**.

## Method-specific input guidance

### Bisection

Enter endpoints `a` and `b` such that the function is continuous on the
interval and `f(a) * f(b) < 0`. The browser can scan for brackets, and the CLI
can auto-detect a bracket when the interval is left blank. This is the most
reliable method when a valid bracket is known.

### Secant

Enter two distinct guesses `x0` and `x1`. The guesses do not need to bracket a
root, but poor guesses or a nearly zero denominator can cause failure or
divergence.

### Newton-Raphson

Enter one initial guess `x0`. The browser estimates the derivative with a
centered finite difference using `h = 10^-7`; the CLI uses the shared numerical
differentiation helper. Newton is fast near a simple root but can fail when
the derivative is near zero or the initial guess is unsuitable.

### Fixed-Point

Enter an iteration function `g(x)` such that the target equation is expressed
as `x = g(x)`, then provide `x0`. Convergence is most likely when `|g'(x)| < 1`
near the fixed point. The web app includes cobweb visualization.

### Jacobi and Gauss-Seidel

Enter a square matrix `A`, right-hand-side vector `b`, and initial vector
`x0` to solve `A x = b`. The browser supports dimensions from `2 x 2` through
`4 x 4`; the CLI supports custom dimensions from 2 through 5. Strict diagonal
dominance is checked and is a useful sufficient condition for convergence.
The browser can auto-pivot rows to improve diagonal structure.

## Tolerance and error metrics

The tolerance field accepts decimal or percentage notation, for example:

```text
1e-6
0.000001
0.0001%
```

The primary stopping metric is the relative approximate error:

```text
e_a = |(x_new - x_old) / x_new|
```

The application also reports:

- Absolute approximate error: `E_a = |x_new - x_old|`.
- Absolute exact error: `E_t = |x_true - x_approx|`, when a true root is supplied.
- Relative exact error: `e_t = |(x_true - x_approx) / x_true|`, when applicable.

For vector methods, the maximum component-wise relative approximate error is
used.

## Project layout

```text
.
├── index.html                    # Browser application
├── app.js                        # Browser parser, solvers, and UI logic
├── styles.css                    # Browser styling
├── bisection.py                  # Python CLI entry point and plotting
├── methods/
│   ├── __init__.py               # Method registry
│   ├── base.py                   # Shared data models and plugin interface
│   ├── bisection.py
│   ├── secant.py
│   ├── newton.py
│   ├── fixed_point.py
│   ├── jacobi.py
│   ├── gauss_seidel.py
│   ├── scanner.py                # Automatic bracket detection
│   └── utils.py                  # Formatting and numerical helpers
├── HOW_TO_USE.md                 # Detailed user guide
├── How_To_Use_Bisection_App.pdf  # Printable user guide
├── Bisection_Method_Explained.pdf
└── Bisection_Method_Presentation.pdf
```

## Troubleshooting

### The browser page is blank or controls do not work

Use a current browser, confirm that `app.js` and `styles.css` are beside
`index.html`, and try the local HTTP server command shown above. Check the
browser developer console for syntax or loading errors.

### “No bracket found”

The scanner only searches a finite domain and relies on sign changes. Enter a
manual interval, widen the search mentally, or choose another root. A
touching root that does not change sign may not be detected by a bracket scan.

### A method diverges or reaches the iteration limit

Try a better initial guess, a valid Bisection bracket, a different
rearrangement for Fixed-Point iteration, or a diagonally dominant system for
Jacobi/Gauss-Seidel. A smaller tolerance does not fix a method that is
diverging.

### Python reports a missing package

Activate the virtual environment and install the dependencies:

```bash
python -m pip install numpy matplotlib
```

### A plot window does not appear

The CLI still saves the plot to `bisection_plot.png`. This is usually a
Matplotlib backend or headless-environment issue rather than a solver issue.

## Learning resources

- [Detailed how-to guide](HOW_TO_USE.md)
- [How to Use Bisection App (PDF)](How_To_Use_Bisection_App.pdf)
- [Bisection Method Explained (PDF)](Bisection_Method_Explained.pdf)
- [Bisection Method Presentation (PDF)](Bisection_Method_Presentation.pdf)

## License

No license file is currently included in this repository. Add a license before
redistributing the project or incorporating it into another product.
