"""
Numerical Methods Root-Finding Application (v3.0)
==================================================

An interactive command-line application supporting a modular plugin system:
  1. Bisection Method (Interval Halving)
  2. Secant Method (Interpolation)
  3. Newton-Raphson Method (Tangent Line)

Architecture:
- Plugin Hierarchy: Root-finding methods reside in the `methods/` package.
- Safe Parser: Natural mathematical expression input with sandbox AST execution.
- Unified 4-Error Suite: Pure Relative Approximate Error (ea <= tol) as stopping rule.
- Full Visual Plotting: Method-specific visualizations (brackets, chords, tangents).
"""

import math
import re
import sys
from typing import Callable, Optional

try:
    import matplotlib.pyplot as plt
    import numpy as np
    from methods import get_available_methods, get_method_by_choice, MethodResult, RootFindingMethod
    from methods.utils import clean_num, SAFE_MATH
except ModuleNotFoundError as e:
    missing_mod = getattr(e, 'name', 'dependency')
    print(f"\n[!] Required package '{missing_mod}' is not installed in your current Python environment.")
    print("    This project contains a configured virtual environment with all dependencies.\n")
    print("    Option 1 (Recommended): Run with the virtual environment:")
    print("       .\\.venv\\Scripts\\python.exe bisection.py\n")
    print("    Option 2: Activate the environment in PowerShell first:")
    print("       .\\.venv\\Scripts\\Activate.ps1")
    print("       python bisection.py\n")
    print("    Option 3: Install into current Python:")
    print("       pip install matplotlib numpy\n")
    sys.exit(1)

# Configuration Constants
DEFAULT_TOLERANCE: float = 0.000001
BANNER_WIDTH: int = 102

SAFE_NAMES = SAFE_MATH


def print_banner(title: str, width: int = BANNER_WIDTH, fill: str = "=") -> None:
    """Print a standardized boxed banner matching table width."""
    border = f"+{fill * (width - 2)}+"
    print(border)
    print(f"|{title.center(width - 2)}|")
    print(border)


def build_function(text: str) -> Callable[[float], float]:
    """Parse and compile user mathematical expression into a safe callable f(x)."""
    expr = text.strip().replace("^", "**")
    # Natural multiplication expansions: 2x -> 2*x, 3sin(x) -> 3*sin(x), (x+1)(x-1) -> (x+1)*(x-1)
    expr = re.sub(r"\)\s*(?=[(\w])", r")*", expr)
    expr = re.sub(r"(?<![a-zA-Z_])(\d+\.?\d*)\s*(?!(?:[eE][+-]?\d+))([a-zA-Z_]\w*)", r"\1*\2", expr)
    expr = re.sub(r"(?<![a-zA-Z_])(\d+\.?\d*)\s*(?=\()", r"\1*", expr)
    expr = re.sub(r"\bx\b\s*(?=[a-zA-Z_]|\()", r"x*", expr)

    code = compile(expr, "<function>", "eval")
    unknown = set(code.co_names) - set(SAFE_NAMES) - {"x"}
    if unknown:
        raise NameError(f"Unknown symbol(s): {', '.join(sorted(unknown))}")

    def f(x: float) -> float:
        try:
            val = eval(code, {"__builtins__": {}}, {**SAFE_NAMES, "x": float(x)})
            if isinstance(val, complex):
                return float(val.real) if abs(val.imag) < 1e-15 else float("nan")
            return float(val)
        except (ZeroDivisionError, ValueError, TypeError):
            return float("nan")
        except OverflowError:
            return float("inf")

    for tx in (1.0, 0.5, 2.0, 0.1, 10.0, -1.0):
        try:
            v = f(tx)
            if math.isfinite(v):
                break
        except Exception:
            continue
    return f


def choose_method() -> RootFindingMethod:
    """Display plugin registry menu and prompt user for method selection."""
    methods = get_available_methods()
    print("  Select Numerical Method:")
    for idx, m in enumerate(methods, start=1):
        print(f"    [{idx}] {m.name} ({m.description})")

    while True:
        choice = input(f"  Enter choice [1-{len(methods)}] (default = 1): ").strip()
        if not choice:
            return methods[0]
        selected = get_method_by_choice(choice)
        if selected:
            return selected
        print(f"    Invalid selection. Please choose a number between 1 and {len(methods)}.")


def read_tolerance() -> float:
    """Prompt for stopping tolerance (supports percentages like '0.05%')."""
    while True:
        text = input("  Enter error tolerance [Enter = 0.0001%]: ").strip()
        if not text:
            return DEFAULT_TOLERANCE
        try:
            val = float(text[:-1]) / 100 if text.endswith("%") else float(text)
            if val <= 0:
                print("    Tolerance must be > 0.")
                continue
            return val
        except ValueError:
            print("    Invalid format. Examples: 0.001, 1e-5, 0.05%")


def read_true_root() -> Optional[float]:
    """Prompt for optional known true root."""
    text = input("  Enter true/exact root if known [Enter = skip]: ").strip()
    if not text:
        return None
    try:
        code = compile(text.replace("^", "**"), "<root>", "eval")
        return float(eval(code, {"__builtins__": {}}, SAFE_NAMES))
    except Exception:
        return None


def print_table(method: RootFindingMethod, result: MethodResult) -> None:
    """Display complete iteration table with method-specific columns."""
    hdr = method.get_table_header()
    sep = "-" * len(hdr)
    print(hdr)
    print(sep)
    n = len(result.rows)
    for idx, row in enumerate(result.rows):
        marker = " <-- [STOP]" if idx == n - 1 else ""
        print(f"{method.format_row(row)}{marker}")
    print(sep)


def print_summary(
    method: RootFindingMethod,
    func_text: str,
    result: MethodResult,
    tol: float,
    f: Callable[[float], float],
    x_true: Optional[float]
) -> None:
    """Display comprehensive summary card and the 4 numerical error types."""
    print()
    print_banner(f"3. CONVERGENCE SUMMARY & ERROR ANALYSIS ({method.name.upper()})")
    print("  Problem Specification:")
    print(f"    * Method Used         : {method.name}")
    print(f"    * Function f(x)       : {func_text}")
    print(f"    * Initial Input       : {result.initial_desc}")
    print(f"    * Error Tolerance     : {tol:g} ({tol * 100:g}%)")
    print("    * Stopping Criterion  : Relative Approximate Error (ea <= tolerance)")
    print()
    if method.key in ("jacobi", "gauss_seidel"):
        final_row = result.rows[-1]
        x_vec = final_row.extra_cols.get("x", [result.root])
        vec_str = ", ".join(f"{v:.8f}" for v in x_vec)
        print("  Solution Results:")
        print(f"    * Solution Vector x   : [{vec_str}]")
        print(f"    * Residual ||Ax - b|| : {final_row.f_val:+.6e}")
        print(f"    * Iterations Required : {result.iterations}")
        print(f"    * Max Rel Approx Error (ea): {fmt_rel(final_row.rel_ea)}")
        print(f"    * Max Abs Approx Error (Ea): {fmt_ea(final_row.ea)}")
        print(f"+{'=' * (BANNER_WIDTH - 2)}+")
        return

    print("  Solution Results:")
    print(f"    * Approximate Root    : {result.root:.10f}")
    try:
        f_root = f(result.root)
        print(f"    * Function Value f(c) : {f_root:+.6e}  (effectively zero)")
    except Exception as e:
        print(f"    * Function Value f(c) : Could not evaluate ({e})")
    print(f"    * Iterations Required : {result.iterations}")
    print()
    print("  Error Analysis (4 Numerical Errors):")

    final_row = result.rows[-1]
    final_rel = final_row.rel_ea
    final_ea = final_row.ea

    if final_rel is not None and not math.isinf(final_rel):
        pct = final_rel * 100
        msg = f"{final_rel:.6f} ({pct:.4f}%)" if 0.001 <= final_rel < 10 else f"{final_rel:.4e} ({pct:.4e}%)"
        print(f"    1. Relative Approx Error (ea) [Stopping Metric]: {msg}")
    else:
        print("    1. Relative Approx Error (ea) [Stopping Metric]: 0.0% (Exact root found)")

    if final_ea is not None:
        print(f"    2. Absolute Approx Error (Ea)                 : {final_ea:.8f}" if 0.001 <= final_ea < 1000 else f"    2. Absolute Approx Error (Ea)                 : {final_ea:.6e}")
    else:
        print("    2. Absolute Approx Error (Ea)                 : 0.0")

    if x_true is not None:
        et = abs(x_true - result.root)
        print(f"    3. Absolute Exact Error  (Et = |x_true - c|)  : {et:.8f}" if 0.001 <= et < 1000 else f"    3. Absolute Exact Error  (Et = |x_true - c|)  : {et:.6e}")
        if abs(x_true) > 1e-12:
            rel_et = et / abs(x_true)
            pct_et = rel_et * 100
            msg_et = f"{rel_et:.6f} ({pct_et:.4f}%)" if 0.001 <= rel_et < 10 else f"{rel_et:.4e} ({pct_et:.4e}%)"
            print(f"    4. Relative Exact Error  (et = |x_true - c|/|x_t|): {msg_et}")
        else:
            print("    4. Relative Exact Error  (et)                 : Undefined (true root is 0)")
    else:
        print("    3. Absolute Exact Error  (Et)                 : N/A (True root not provided)")
        print("    4. Relative Exact Error  (et)                 : N/A (True root not provided)")
    print(f"+{'=' * (BANNER_WIDTH - 2)}+")


def plot_solution(
    method: RootFindingMethod,
    func_text: str,
    f: Optional[Callable[[float], float]],
    result: MethodResult,
    tol: float,
    x_true: Optional[float] = None,
    filename: str = "bisection_plot.png",
    show: bool = True
) -> None:
    """Generate publication-grade 2-panel convergence plot."""
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(13, 5.2), dpi=150)
    fig.patch.set_facecolor("#F8FAFC")

    # ----------------------------------------------------
    # Panel 1: Function Curve or Linear System Visuals
    # ----------------------------------------------------
    ax1.set_facecolor("#FFFFFF")
    if method.key in ("jacobi", "gauss_seidel"):
        method.draw_method_plot(ax1, None, result)
        ax1.set_title(f"{method.name}: Component Convergence", fontsize=10.5, fontweight="bold")
    else:
        # Collect all sampled points (including initial inputs/guesses) for an optimal x-range
        all_points = [r.estimate for r in result.rows]
        for r in result.rows:
            for k in ("a", "b", "p0", "p1", "xn", "xk", "x_next"):
                if k in r.extra_cols and r.extra_cols[k] is not None and math.isfinite(r.extra_cols[k]):
                    all_points.append(r.extra_cols[k])

        span = max(abs(max(all_points) - min(all_points)), 1.0)
        xv = np.linspace(min(all_points) - 0.25 * span, max(all_points) + 0.25 * span, 500)
        yv = []
        for x in xv:
            try:
                val = f(x) if f else 0.0
                yv.append(val if math.isfinite(val) else np.nan)
            except Exception:
                yv.append(np.nan)

        if f and func_text:
            ax1.plot(xv, yv, color="#1E40AF", linewidth=2.0, label=f"f(x) = {func_text}")
        ax1.axhline(0, color="#64748B", linestyle="--", linewidth=1.0)

        # Invoke plugin-specific plotting (shading, chords, tangents, cobweb)
        method.draw_method_plot(ax1, f, result)

        # Highlight final root
        if f:
            try:
                ax1.plot(result.root, f(result.root), "*", color="#D97706", markersize=14, zorder=6, label=f"Root ≈ {result.root:.5f}")
            except Exception:
                pass
        if x_true is not None:
            ax1.axvline(x_true, color="#059669", linestyle=":", linewidth=1.2, label=f"True Root = {x_true:.5f}")

        ax1.set_title(f"{method.name}: Geometric Convergence", fontsize=10.5, fontweight="bold")
        ax1.set_xlabel("x", fontsize=9.5)
        ax1.set_ylabel("f(x)", fontsize=9.5)
        ax1.grid(True, linestyle=":", alpha=0.6)
        ax1.legend(fontsize=7.5)

    # ----------------------------------------------------
    # Panel 2: Error Decay Trajectory (Semi-Log)
    # ----------------------------------------------------
    ax2.set_facecolor("#FFFFFF")
    iters = [r.iteration for r in result.rows]

    # Filter valid positive finite points individually to prevent shape mismatches
    rel_pts = [(r.iteration, r.rel_ea) for r in result.rows if r.rel_ea is not None and r.rel_ea > 0 and math.isfinite(r.rel_ea)]
    ea_pts = [(r.iteration, r.ea) for r in result.rows if r.ea is not None and r.ea > 0 and math.isfinite(r.ea)]

    if rel_pts:
        rel_x, rel_y = zip(*rel_pts)
        ax2.semilogy(rel_x, rel_y, "o-", color="#0284C7", linewidth=1.8, markersize=5, label="Relative Approx Error (ea)")
        ax2.plot(rel_x[-1], rel_y[-1], "o", color="#DC2626", markersize=8)

    if ea_pts:
        ea_x, ea_y = zip(*ea_pts)
        ax2.semilogy(ea_x, ea_y, "s--", color="#10B981", linewidth=1.5, markersize=4, alpha=0.8, label="Absolute Approx Error (Ea)")

    ax2.axhline(tol, color="#DC2626", linestyle=":", linewidth=1.5, label=f"Tolerance = {tol:g}")

    ax2.set_title("Semi-Log Error Decay Trajectory", fontsize=10.5, fontweight="bold")
    ax2.set_xlabel("Iteration", fontsize=9.5)
    ax2.set_ylabel("Error (Log Scale)", fontsize=9.5)
    ax2.grid(True, which="both", linestyle=":", alpha=0.6)
    ax2.legend(fontsize=8)

    plt.tight_layout()
    plt.savefig(filename, dpi=200, bbox_inches="tight")
    print(f"\n  * Graphical plot saved to: {filename}")
    if show:
        try:
            plt.show()
        except Exception:
            pass
    plt.close()


def main() -> None:
    """Interactive controller loop for the numerical methods suite."""
    print()
    print_banner("NUMERICAL METHODS APPLICATION (v4.0)")

    while True:
        print()
        print_banner("1. PROBLEM SPECIFICATION CONFIGURATION")
        # Plugin method selection first
        method = choose_method()

        f = None
        text = ""
        x_true = None

        if method.key in ("jacobi", "gauss_seidel"):
            text = "Linear System Ax = b"
            inputs = method.read_inputs()
            tol = read_tolerance()
        else:
            while True:
                text = input("  Enter function f(x) (e.g. x^3-7x+1, 2x+sin(x)): ").strip()
                if not text:
                    continue
                try:
                    f = build_function(text)
                    break
                except Exception as e:
                    print(f"    Could not understand function ({e}). Try again.")

            inputs = method.read_inputs(f)
            tol = read_tolerance()
            x_true = read_true_root()

        # Execute method algorithm
        print()
        print_banner(f"2. {method.name.upper()} ITERATION TABLE")
        result = method.solve(f, inputs, tol)
        print_table(method, result)
        print_summary(method, text, result, tol, f, x_true)

        # Graphical plot prompt
        print()
        if input("Generate & display graphical plot? [Enter = yes, 'n' = skip]: ").strip().lower() != "n":
            plot_solution(method, text, f, result, tol, x_true=x_true, filename="bisection_plot.png", show=True)

        print()
        if input("Press Enter to solve another problem (or 'q' to quit): ").strip().lower() == "q":
            print()
            print_banner("APPLICATION SESSION TERMINATED")
            print("Thank you for using the Numerical Methods Suite. Goodbye!\n")
            break


if __name__ == "__main__":
    main()
