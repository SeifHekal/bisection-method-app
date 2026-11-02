"""
Secant Method Plugin (Two-Point Linear Interpolation).
"""

from typing import Callable, Tuple
import matplotlib.axes

from .base import IterationRow, MethodResult, RootFindingMethod
from .utils import clean_num, fmt_ea, fmt_rel, fmt_val


class SecantMethod(RootFindingMethod):
    """Secant Method plugin implementing two-point chord approximation."""

    @property
    def key(self) -> str:
        return "secant"

    @property
    def name(self) -> str:
        return "Secant Method"

    @property
    def description(self) -> str:
        return "Two-Point Secant Line (Superlinear Convergence)"

    def read_inputs(self, f: Callable[[float], float]) -> Tuple[float, float]:
        """Prompt user for two initial guesses x0, x1, or auto-detect if left blank."""
        from .scanner import auto_detect_bracket, find_brackets

        while True:
            text = input("  Enter two initial guesses as x0,x1 (e.g. 2,3) [Enter = auto-detect]: ").strip()
            if not text:
                print("    [Auto-Detect] Scanning function domain for root brackets...")
                rec = auto_detect_bracket(f, preference="smallest_positive")
                if rec is None:
                    print("    [Auto-Detect] No root bracket found in [-10, 10]. Please enter x0,x1 manually.")
                    continue
                print(f"    [Auto-Detect] Auto-selected guesses x0={rec[0]:g}, x1={rec[1]:g}")
                return rec[0], rec[1]

            try:
                parts = [float(p) for p in text.split(",")]
                if len(parts) != 2:
                    raise ValueError
                if parts[0] == parts[1]:
                    print("    x0 and x1 must be distinct numbers.")
                    continue
                return parts[0], parts[1]
            except ValueError:
                print("    Invalid input. Enter two comma-separated numbers (e.g. 2,3) or press Enter to auto-detect.")

    def solve(
        self,
        f: Callable[[float], float],
        inputs: Tuple[float, float],
        tol: float,
        max_iter: int = 1000
    ) -> MethodResult:
        x0, x1 = inputs
        initial_desc = f"Initial guesses x0 = {x0:g}, x1 = {x1:g}"

        rows = []
        p0, p1 = x0, x1
        f0, f1 = f(p0), f(p1)

        for i in range(1, max_iter + 1):
            denom = f1 - f0
            if abs(denom) < 1e-15:
                break

            # Secant formula: p2 = p1 - f1 * (p1 - p0) / (f1 - f0)
            p2 = p1 - f1 * (p1 - p0) / denom
            f2 = f(p2)
            ea = abs(p2 - p1)
            rel_ea = (ea / abs(p2)) if abs(p2) > 1e-15 else float("inf")

            rows.append(IterationRow(
                iteration=i,
                estimate=p2,
                f_val=f2,
                ea=ea,
                rel_ea=rel_ea,
                extra_cols={"p0": p0, "p1": p1, "p2": p2, "f0": f0, "f1": f1}
            ))

            if abs(f2) < 1e-15 or rel_ea <= tol:
                break

            p0, p1 = p1, p2
            f0, f1 = f1, f2

        return MethodResult(
            method_name=self.name,
            root=clean_num(rows[-1].estimate),
            iterations=len(rows),
            rows=rows,
            initial_desc=initial_desc
        )

    def get_table_header(self) -> str:
        return f"{'Iter':>5} | {'x_(n-1)':>14} | {'x_n':>14} | {'x_(n+1)':>14} | {'Approx Err (Ea)':>16} | {'Rel Approx (ea)':>22}"

    def format_row(self, row: IterationRow) -> str:
        p0 = row.extra_cols["p0"]
        p1 = row.extra_cols["p1"]
        p2 = row.extra_cols["p2"]
        return f"{row.iteration:>5} | {fmt_val(p0)} | {fmt_val(p1)} | {fmt_val(p2)} | {fmt_ea(row.ea)} | {fmt_rel(row.rel_ea)}"

    def draw_method_plot(
        self,
        ax: matplotlib.axes.Axes,
        f: Callable[[float], float],
        result: MethodResult
    ) -> None:
        """Render secant chord lines connecting successive iteration points down to the x-axis."""
        # Draw secant lines for the first 3 iterations to keep visualization clear and uncluttered
        steps_to_plot = result.rows[:3]
        colors = ["#D97706", "#0D9488", "#7C3AED"]

        for idx, row in enumerate(steps_to_plot):
            p0 = row.extra_cols["p0"]
            p1 = row.extra_cols["p1"]
            p2 = row.extra_cols["p2"]
            f0 = row.extra_cols["f0"]
            f1 = row.extra_cols["f1"]
            col = colors[idx % len(colors)]

            # Draw the continuous secant line from the outermost point through the other point down to p2
            # Sort the points along the line: (p0, f0), (p1, f1), and (p2, 0)
            pts = sorted([(p0, f0), (p1, f1), (p2, 0.0)], key=lambda t: t[0])
            xs = [pt[0] for pt in pts]
            ys = [pt[1] for pt in pts]

            ax.plot(xs, ys, "--", color=col, linewidth=1.5,
                    label=f"Secant Line {idx + 1}" if idx == 0 else None)

            # Mark curve evaluation points (p0, f(p0)) and (p1, f(p1))
            ax.plot([p0, p1], [f0, f1], "o", color=col, markersize=5)

            # Mark the new intercept estimate p2 on the x-axis
            ax.plot(p2, 0, "x", color=col, markersize=7, markeredgewidth=2)

        # Plot all intermediate x_(n+1) guesses on zero line
        all_pts = [r.estimate for r in result.rows[:-1]]
        if all_pts:
            ax.scatter(all_pts, [0] * len(all_pts), color="#9333EA", s=24, alpha=0.6, zorder=4, label="Estimates x_(n+1)")
