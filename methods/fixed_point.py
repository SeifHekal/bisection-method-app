"""
Fixed-Point Iteration Method Plugin (x = g(x)).
"""

import math
from typing import Callable, Optional, Tuple
import matplotlib.axes
import numpy as np

from .base import IterationRow, MethodResult, RootFindingMethod
from .utils import clean_num, fmt_ea, fmt_rel, fmt_val, SAFE_MATH


class FixedPointMethod(RootFindingMethod):
    """Fixed-Point Iteration plugin implementing successive substitution x_{k+1} = g(x_k)."""

    @property
    def key(self) -> str:
        return "fixed_point"

    @property
    def name(self) -> str:
        return "Fixed-Point Iteration"

    @property
    def description(self) -> str:
        return "Successive Substitution (x = g(x))"

    def read_inputs(self, f: Callable[[float], float]) -> Tuple[Callable[[float], float], float, str]:
        """Prompt user for iteration function g(x) and initial guess x0."""
        from bisection import build_function

        print("  Fixed-Point Iteration requires an equation of the form x = g(x).")
        while True:
            g_str = input("  Enter iteration function g(x) [Enter = auto (x - f(x))]: ").strip()
            if not g_str:
                g_fn = lambda x: x - f(x)
                g_expr = "x - f(x)"
                print(f"    [Auto-Selected] Using g(x) = x - f(x)")
                break
            try:
                g_fn = build_function(g_str)
                g_expr = g_str
                break
            except Exception as e:
                print(f"    Invalid expression for g(x): {e}. Please try again.")

        while True:
            text = input("  Enter initial guess x0 (e.g. 0.5) [Enter = 0]: ").strip()
            if not text:
                x0 = 0.0
                break
            try:
                x0 = float(text)
                break
            except ValueError:
                print("    Invalid input. Enter a valid real number.")

        return g_fn, x0, g_expr

    def solve(
        self,
        f: Callable[[float], float],
        inputs: Tuple,
        tol: float,
        max_iter: int = 1000
    ) -> MethodResult:
        g_fn, x0, g_expr = inputs
        initial_desc = f"Initial guess x0 = {x0:g}, g(x) = {g_expr}"

        rows = []
        curr = x0

        for i in range(1, max_iter + 1):
            try:
                x_next = g_fn(curr)
            except Exception:
                x_next = float("nan")

            if not math.isfinite(x_next) or abs(x_next) > 1e12:
                # Divergence detected
                ea = abs(x_next - curr) if math.isfinite(x_next) else float("inf")
                rel_ea = float("inf")
                rows.append(IterationRow(
                    iteration=i,
                    estimate=curr,
                    f_val=f(curr) if f else 0.0,
                    ea=ea,
                    rel_ea=rel_ea,
                    extra_cols={"xk": curr, "x_next": x_next, "diverged": True}
                ))
                break

            ea = abs(x_next - curr)
            rel_ea = (ea / abs(x_next)) if abs(x_next) > 1e-15 else float("inf")

            rows.append(IterationRow(
                iteration=i,
                estimate=x_next,
                f_val=f(x_next) if f else 0.0,
                ea=ea,
                rel_ea=rel_ea,
                extra_cols={"xk": curr, "x_next": x_next, "g_fn": g_fn}
            ))

            if rel_ea <= tol or ea < 1e-15:
                break

            curr = x_next

        return MethodResult(
            method_name=self.name,
            root=clean_num(rows[-1].estimate),
            iterations=len(rows),
            rows=rows,
            initial_desc=initial_desc
        )

    def get_table_header(self) -> str:
        return f"{'Iter':>5} | {'x_k':>14} | {'g(x_k)=x_k+1':>14} | {'f(x_k+1)':>14} | {'Approx Err (Ea)':>16} | {'Rel Approx (ea)':>22}"

    def format_row(self, row: IterationRow) -> str:
        xk = row.extra_cols.get("xk", row.estimate)
        x_next = row.extra_cols.get("x_next", row.estimate)
        f_val = row.f_val
        return f"{row.iteration:>5} | {fmt_val(xk)} | {fmt_val(x_next)} | {fmt_val(f_val)} | {fmt_ea(row.ea)} | {fmt_rel(row.rel_ea)}"

    def draw_method_plot(
        self,
        ax: matplotlib.axes.Axes,
        f: Callable[[float], float],
        result: MethodResult
    ) -> None:
        """Render Cobweb staircase diagram for Fixed-Point Iteration."""
        if not result.rows:
            return

        g_fn = result.rows[0].extra_cols.get("g_fn")
        if not g_fn:
            return

        # Determine plotting range around points
        all_x = [r.extra_cols.get("xk", 0) for r in result.rows] + [r.estimate for r in result.rows]
        min_x = min(all_x)
        max_x = max(all_x)
        span = max(abs(max_x - min_x), 1.0)
        x_plot = np.linspace(min_x - 0.5 * span, max_x + 0.5 * span, 400)

        # Plot y = x identity line
        ax.plot(x_plot, x_plot, linestyle="--", color="#f59e0b", linewidth=1.5, label="y = x (Identity)")

        # Plot y = g(x)
        y_g = []
        for x in x_plot:
            try:
                v = g_fn(x)
                y_g.append(v if math.isfinite(v) else np.nan)
            except Exception:
                y_g.append(np.nan)
        ax.plot(x_plot, y_g, color="#8b5cf6", linewidth=1.8, label="y = g(x)")

        # Draw Cobweb staircase
        first_xk = result.rows[0].extra_cols.get("xk", 0)
        cobweb_x = [first_xk]
        cobweb_y = [0.0]

        for r in result.rows:
            xk = r.extra_cols.get("xk", r.estimate)
            x_next = r.extra_cols.get("x_next", r.estimate)
            if not math.isfinite(x_next):
                break
            # Vertical step: (xk, xk) -> (xk, g(xk)) = (xk, x_next)
            cobweb_x.extend([xk, xk])
            cobweb_y.extend([xk, x_next])
            # Horizontal step: (xk, x_next) -> (x_next, x_next)
            cobweb_x.append(x_next)
            cobweb_y.append(x_next)

        ax.plot(cobweb_x, cobweb_y, color="#ec4899", linewidth=1.4, alpha=0.85, label="Cobweb Path")
        # Mark final fixed point
        final_root = result.root
        ax.scatter([final_root], [final_root], color="#10b981", s=70, zorder=6, label=f"Fixed Point x*={final_root:.5g}")
