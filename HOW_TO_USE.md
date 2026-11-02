# How to Use RootFinder Studio

This guide covers the browser application first and the Python command-line
version second.

## Browser application

### Start the app

Either open `index.html` directly or run:

```bash
python -m http.server 8000
```

Open <http://localhost:8000> in a browser.

### Solve a nonlinear equation

1. Choose **Bisection**, **Secant**, or **Newton**.
2. Enter a function such as `x^3 - 7x + 1`.
3. Provide the required starting values:
   - Bisection: `a` and `b`.
   - Secant: `x0` and `x1`.
   - Newton: `x0`.
4. Enter a tolerance such as `0.0001%` or `1e-6`.
5. Set the maximum number of iterations.
6. Click **Calculate**.

For Bisection, use **Scan Roots** to search for sign-change brackets in
`[-10, 10]`, then click a bracket to copy it into the input fields.

### Read the result

The result area contains:

- Root estimate and function value.
- Number of iterations.
- Relative and absolute approximate errors.
- Exact errors when a true root was entered.
- A geometric graph showing the selected method.
- A semi-log error-decay graph.
- A step description for the selected iteration.
- A complete iteration table.

Use the first/previous/play/next/last controls or the slider to inspect the
algorithm one iteration at a time. Enable auto-zoom to follow the active
region of the graph.

### Export results

Open the **Iteration Table** tab and use:

- **Copy Table** to copy tab-separated values.
- **Download CSV** to save the iteration data as a CSV file.

### Compare methods

Enter a nonlinear function, then click **Compare Methods**. The app runs
Bisection, Secant, and Newton-Raphson using their configured starting values
and displays an iteration/convergence comparison. This is useful for seeing
the trade-off between robustness and speed.

## Fixed-Point iteration

1. Select **Fixed Point**.
2. Enter the iteration function `g(x)`, for example `cos(x)`.
3. Enter the initial guess `x0`.
4. Set the tolerance and maximum iterations.
5. Click **Calculate**.

The target is a fixed point satisfying `x = g(x)`. If the result diverges,
try another `g(x)` rearrangement or a different starting value. The geometric
panel displays the identity line `y = x`, the iteration curve `y = g(x)`, and
the cobweb path.

## Jacobi and Gauss-Seidel

1. Select **Jacobi** or **Gauss-Seidel**.
2. Choose a matrix size.
3. Enter the coefficient matrix `A`, right-hand side `b`, and initial vector
   `x0`.
4. Optionally use **Auto Pivot** to rearrange rows.
5. Set tolerance and maximum iterations.
6. Click **Calculate**.

The result displays the solution vector, residual norm, iteration count, and
maximum component-wise errors. A strictly diagonally dominant matrix is a good
starting point because it provides a sufficient convergence condition for both
methods.

## Python CLI

Install the dependencies and start the program:

```bash
python -m venv .venv

# Linux/macOS
source .venv/bin/activate

# Windows PowerShell
.venv\Scripts\Activate.ps1

python -m pip install numpy matplotlib
python bisection.py
```

The CLI workflow is:

1. Select one of the six methods.
2. Enter a function or linear-system data.
3. Enter method-specific starting values, or press Enter when auto-detection
   is offered.
4. Enter the tolerance.
5. Optionally enter a known true root for exact-error comparison.
6. Review the iteration table and convergence summary.
7. Press Enter to generate and display the plot, or enter `n` to skip it.
8. Press Enter to solve another problem, or enter `q` to quit.

The generated CLI plot is saved as `bisection_plot.png`.

## Expression examples

```text
x^3 - 7x + 1
cos(x) - x
sqrt(x + 2) - 1
2sin(x) - 0.5
```

Use `^` or `**` for powers. Implicit multiplication such as `2x` and
`3sin(x)` is accepted. Functions include `sin`, `cos`, `tan`, `asin`, `acos`,
`atan`, `sinh`, `cosh`, `tanh`, `exp`, `log`, `ln`, `sqrt`, and `cbrt`;
constants include `pi` and `e`.

## Choosing a method

- Use **Bisection** when you can provide a valid sign-changing bracket and
  want dependable convergence.
- Use **Secant** when you want a derivative-free method with faster typical
  convergence.
- Use **Newton** when you have a good starting guess and want rapid local
  convergence.
- Use **Fixed Point** when a stable contraction form `x = g(x)` is available.
- Use **Jacobi** for simple, simultaneous updates of a well-conditioned
  diagonally dominant system.
- Use **Gauss-Seidel** when reusing current updates can improve convergence.

## Common problems

| Problem | Suggested action |
| --- | --- |
| No Bisection bracket found | Enter a manual interval or choose a wider interval. |
| Newton derivative is near zero | Choose another initial guess. |
| Secant denominator is near zero | Choose distinct, better-spaced guesses. |
| Fixed-Point iterations diverge | Change `g(x)` or choose another `x0`. |
| Jacobi/Gauss-Seidel diverges | Check diagonal dominance, pivot rows, or use a better system ordering. |
| Maximum iterations reached | Improve the initial values or use a looser tolerance after checking the result. |
