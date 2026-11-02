"""
Gauss-Seidel Method Plugin for Systems of Linear Equations (Ax = b).
"""

import math
from typing import Callable, Optional, Tuple
import matplotlib.axes
import numpy as np

from .base import IterationRow, MethodResult, RootFindingMethod
from .utils import clean_num, fmt_ea, fmt_rel, fmt_val


class GaussSeidelMethod(RootFindingMethod):
    """Gauss-Seidel Iterative Method (Successive Displacements) for solving Ax = b."""

    @property
    def key(self) -> str:
        return "gauss_seidel"

    @property
    def name(self) -> str:
        return "Gauss-Seidel Method"

    @property
    def description(self) -> str:
        return "Successive Displacements for Linear Systems (Ax = b)"

    def read_inputs(self, f: Optional[Callable[[float], float]] = None) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """Prompt user for matrix A, vector b, and initial guess x0."""
        from .jacobi import JacobiMethod
        # Reuse same robust interactive matrix reading
        jm = JacobiMethod()
        return jm.read_inputs(f)

    def solve(
        self,
        f: Optional[Callable[[float], float]],
        inputs: Tuple[np.ndarray, np.ndarray, np.ndarray],
        tol: float,
        max_iter: int = 1000
    ) -> MethodResult:
        A, b, x0 = inputs
        n = len(b)
        initial_desc = f"Linear system {n}x{n}, x0 = [{', '.join(f'{v:g}' for v in x0)}]"

        rows = []
        x_curr = x0.astype(float).copy()

        for k in range(1, max_iter + 1):
            x_prev_step = x_curr.copy()
            x_next = x_curr.copy()

            for i in range(n):
                aii = A[i, i]
                if abs(aii) < 1e-15:
                    raise ZeroDivisionError(f"Zero pivot on diagonal element A[{i+1},{i+1}]")
                # Using newly calculated components j < i from x_next, and old j > i from x_next
                s = sum(A[i, j] * x_next[j] for j in range(n) if j != i)
                x_next[i] = (b[i] - s) / aii

            # Relative errors compared to previous iteration vector
            diffs = np.abs(x_next - x_prev_step)
            rel_errors = []
            for d, xn in zip(diffs, x_next):
                rel_errors.append((d / abs(xn)) if abs(xn) > 1e-15 else float("inf"))

            max_ea = float(np.max(diffs))
            max_rel_ea = float(np.max(rel_errors))

            rows.append(IterationRow(
                iteration=k,
                estimate=float(x_next[0]),
                f_val=float(np.linalg.norm(np.dot(A, x_next) - b)),
                ea=max_ea,
                rel_ea=max_rel_ea,
                extra_cols={"x": x_next.copy(), "prev_x": x_prev_step.copy(), "n": n, "A": A, "b": b}
            ))

            if max_rel_ea <= tol or max_ea < 1e-15:
                break

            x_curr = x_next.copy()

        return MethodResult(
            method_name=self.name,
            root=clean_num(float(rows[-1].estimate)),
            iterations=len(rows),
            rows=rows,
            initial_desc=initial_desc
        )

    def get_table_header(self) -> str:
        return f"{'Iter':>5} | {'x_1':>12} | {'x_2':>12} | {'x_3':>12} | {'Max Abs Err':>14} | {'Max Rel Err (ea)':>20}"

    def format_row(self, row: IterationRow) -> str:
        x_vec = row.extra_cols.get("x", [row.estimate])
        x_str = " | ".join(f"{v:>12.6f}" for v in x_vec[:3])
        return f"{row.iteration:>5} | {x_str} | {fmt_ea(row.ea):>14} | {fmt_rel(row.rel_ea):>20}"

    def draw_method_plot(
        self,
        ax: matplotlib.axes.Axes,
        f: Optional[Callable[[float], float]],
        result: MethodResult
    ) -> None:
        """Render component trajectories x_i vs iteration k."""
        if not result.rows:
            return

        iters = [r.iteration for r in result.rows]
        n = result.rows[0].extra_cols.get("n", 1)
        colors = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"]

        for i in range(n):
            vals = [r.extra_cols["x"][i] for r in result.rows]
            ax.plot(iters, vals, marker="s", markersize=4, color=colors[i % len(colors)], label=f"x_{i+1}")

        ax.set_xlabel("Iteration (k)")
        ax.set_ylabel("Solution Vector Components")
        ax.grid(True, linestyle=":", alpha=0.6)
        ax.legend()
