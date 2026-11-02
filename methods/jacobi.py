"""
Jacobi Method Plugin for Systems of Linear Equations (Ax = b).
"""

import math
from typing import Callable, List, Optional, Tuple
import matplotlib.axes
import numpy as np

from .base import IterationRow, MethodResult, RootFindingMethod
from .utils import clean_num, fmt_ea, fmt_rel, fmt_val


class JacobiMethod(RootFindingMethod):
    """Jacobi Iterative Method for solving linear systems Ax = b."""

    @property
    def key(self) -> str:
        return "jacobi"

    @property
    def name(self) -> str:
        return "Jacobi Method"

    @property
    def description(self) -> str:
        return "Simultaneous Displacements for Linear Systems (Ax = b)"

    def read_inputs(self, f: Optional[Callable[[float], float]] = None) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """Prompt user for matrix A, vector b, and initial guess x0."""
        print("\n  Jacobi Method solves systems of linear equations: A * x = b")
        print("  Presets available:")
        print("    [1] 3x3 Diagonally Dominant: [4 -1 1; 4 -8 1; -2 1 5] * x = [7; -21; 15]")
        print("    [2] 2x2 Intersection System: [5 -2; 1 4] * x = [9; 15]")
        print("    [3] 3x3 Circuit System:      [10 -2 -1; -2 10 -1; -1 -2 5] * x = [3; 15; 10]")
        print("    [4] Custom Matrix Entry")

        choice = input("  Select preset or custom [1-4, Enter = 1]: ").strip()

        if choice == "2":
            A = np.array([[5.0, -2.0], [1.0, 4.0]])
            b = np.array([9.0, 15.0])
            x0 = np.zeros(2)
        elif choice == "3":
            A = np.array([[10.0, -2.0, -1.0], [-2.0, 10.0, -1.0], [-1.0, -2.0, 5.0]])
            b = np.array([3.0, 15.0, 10.0])
            x0 = np.zeros(3)
        elif choice == "4":
            while True:
                try:
                    n_str = input("    Enter system dimension n (2 to 5) [Enter = 3]: ").strip()
                    n = int(n_str) if n_str else 3
                    if 2 <= n <= 5:
                        break
                    print("    Dimension must be between 2 and 5.")
                except ValueError:
                    print("    Invalid number.")

            A = np.zeros((n, n))
            b = np.zeros(n)
            print(f"    Enter row-by-row coefficients (comma-separated, e.g. for row: a11,a12,...,b):")
            for i in range(n):
                while True:
                    row_str = input(f"      Row {i+1} ({n} coefficients + 1 RHS b): ").strip()
                    try:
                        vals = [float(v.strip()) for v in row_str.split(",")]
                        if len(vals) != n + 1:
                            print(f"      Expected {n+1} comma-separated numbers.")
                            continue
                        A[i, :] = vals[:n]
                        b[i] = vals[n]
                        break
                    except ValueError:
                        print("      Invalid input. Enter comma-separated numbers.")
            x0 = np.zeros(n)
        else:
            # Default preset 1
            A = np.array([[4.0, -1.0, 1.0], [4.0, -8.0, 1.0], [-2.0, 1.0, 5.0]])
            b = np.array([7.0, -21.0, 15.0])
            x0 = np.zeros(3)

        # Check diagonal dominance
        diag = np.abs(np.diag(A))
        off_diag = np.sum(np.abs(A), axis=1) - diag
        is_dom = np.all(diag > off_diag)
        if is_dom:
            print("  [Diagonal Dominance] Matrix is strictly diagonally dominant. Convergence guaranteed!")
        else:
            print("  [Warning] Matrix is NOT strictly diagonally dominant. May converge slowly or diverge.")

        return A, b, x0

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
            x_next = np.zeros(n)
            for i in range(n):
                aii = A[i, i]
                if abs(aii) < 1e-15:
                    raise ZeroDivisionError(f"Zero pivot on diagonal element A[{i+1},{i+1}]")
                s = sum(A[i, j] * x_curr[j] for j in range(n) if j != i)
                x_next[i] = (b[i] - s) / aii

            # Relative errors
            diffs = np.abs(x_next - x_curr)
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
                extra_cols={"x": x_next.copy(), "prev_x": x_curr.copy(), "n": n, "A": A, "b": b}
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
            ax.plot(iters, vals, marker="o", markersize=4, color=colors[i % len(colors)], label=f"x_{i+1}")

        ax.set_xlabel("Iteration (k)")
        ax.set_ylabel("Solution Vector Components")
        ax.grid(True, linestyle=":", alpha=0.6)
        ax.legend()
