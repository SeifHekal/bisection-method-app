"""
Newton-Raphson Method Plugin (Tangent Line Iteration).
"""

from typing import Callable, Tuple
import matplotlib.axes

from .base import IterationRow, MethodResult, RootFindingMethod
from .utils import clean_num, fmt_ea, fmt_rel, fmt_val, num_diff


class NewtonMethod(RootFindingMethod):
    """Newton-Raphson Method plugin implementing tangent line approximation."""

    @property
    def key(self) -> str:
        return "newton"

    @property
    def name(self) -> str:
        return "Newton-Raphson Method"

    @property
    def description(self) -> str:
        return "Tangent Line Iteration (Quadratic Convergence)"

    def read_inputs(self, f: Callable[[float], float]) -> Tuple[float]:
        """Prompt user for a single initial guess x0, or auto-detect if left blank."""
        from .scanner import auto_detect_bracket

        while True:
            text = input("  Enter initial guess x0 (e.g. 2.5) [Enter = auto-detect]: ").strip()
            if not text:
                print("    [Auto-Detect] Scanning function domain for root brackets...")
                rec = auto_detect_bracket(f, preference="smallest_positive")
                if rec is None:
                    print("    [Auto-Detect] No root bracket found in [-10, 10]. Please enter x0 manually.")
                    continue
                mid = (rec[0] + rec[1]) / 2.0
                print(f"    [Auto-Detect] Auto-selected initial guess x0 = {mid:g} (bracket [{rec[0]:g}, {rec[1]:g}])")
                return (mid,)

            try:
                val = float(text)
                return (val,)
            except ValueError:
                print("    Invalid input. Enter a valid number or press Enter to auto-detect.")

    def solve(
        self,
        f: Callable[[float], float],
        inputs: Tuple[float],
        tol: float,
        max_iter: int = 1000
    ) -> MethodResult:
        x0 = inputs[0]
        initial_desc = f"Initial guess x0 = {x0:g}"

        rows = []
        curr = x0
        prev = None

        for i in range(1, max_iter + 1):
            fc = f(curr)
            dfc = num_diff(f, curr)
            ea = abs(curr - prev) if prev is not None else None
            rel_ea = (ea / abs(curr)) if (ea is not None and abs(curr) > 1e-15) else (float("inf") if ea is not None else None)

            rows.append(IterationRow(
                iteration=i,
                estimate=curr,
                f_val=fc,
                ea=ea,
                rel_ea=rel_ea,
                extra_cols={"xn": curr, "fxn": fc, "dfxn": dfc}
            ))

            if abs(fc) < 1e-15 or (rel_ea is not None and rel_ea <= tol):
                break

            if abs(dfc) < 1e-15:
                print("    [Warning] Derivative near zero (horizontal tangent). Halting iteration.")
                break

            prev = curr
            curr = curr - fc / dfc

        return MethodResult(
            method_name=self.name,
            root=clean_num(rows[-1].estimate),
            iterations=len(rows),
            rows=rows,
            initial_desc=initial_desc
        )

    def get_table_header(self) -> str:
        df_col = "f'(x_n)"
        return f"{'Iter':>5} | {'x_n':>14} | {'f(x_n)':>14} | {df_col:>14} | {'Approx Err (Ea)':>16} | {'Rel Approx (ea)':>22}"

    def format_row(self, row: IterationRow) -> str:
        xn = row.extra_cols["xn"]
        fxn = row.extra_cols["fxn"]
        dfxn = row.extra_cols["dfxn"]
        return f"{row.iteration:>5} | {fmt_val(xn)} | {fmt_val(fxn)} | {fmt_val(dfxn)} | {fmt_ea(row.ea)} | {fmt_rel(row.rel_ea)}"

    def draw_method_plot(
        self,
        ax: matplotlib.axes.Axes,
        f: Callable[[float], float],
        result: MethodResult
    ) -> None:
        """Render tangent lines dropping from curve down to x-axis crossings."""
        # Draw tangent projections for the first 3 iterations
        steps_to_plot = result.rows[:3]
        colors = ["#DC2626", "#0D9488", "#2563EB"]

        for idx, row in enumerate(steps_to_plot):
            xn = row.extra_cols["xn"]
            fxn = row.extra_cols["fxn"]
            col = colors[idx % len(colors)]

            # Vertical drop to curve point (xn, fxn)
            ax.plot([xn, xn], [0, fxn], ":", color=col, alpha=0.7)
            ax.plot(xn, fxn, "o", color=col, markersize=5)

            # If there is a subsequent step, connect tangent to x_(n+1)
            if idx + 1 < len(result.rows):
                x_next = result.rows[idx + 1].estimate
                ax.plot([xn, x_next], [fxn, 0], "-", color=col, linewidth=1.4,
                        label=f"Tangent Line {idx + 1}" if idx == 0 else None)
                ax.plot(x_next, 0, "x", color=col, markersize=7)

        # Plot all estimates on zero axis
        all_pts = [r.estimate for r in result.rows[:-1]]
        if all_pts:
            ax.scatter(all_pts, [0] * len(all_pts), color="#A855F7", s=22, alpha=0.6, zorder=4, label="Estimates x_k")
