"""
Bisection Method Plugin (Interval Halving).
"""

from typing import Callable, Tuple
import matplotlib.axes

from .base import IterationRow, MethodResult, RootFindingMethod
from .utils import clean_num, fmt_ea, fmt_rel, fmt_val


class BisectionMethod(RootFindingMethod):
    """Bisection Method plugin implementing interval contraction and Bolzano check."""

    @property
    def key(self) -> str:
        return "bisection"

    @property
    def name(self) -> str:
        return "Bisection Method"

    @property
    def description(self) -> str:
        return "Interval Halving (Guaranteed Convergence)"

    def read_inputs(self, f: Callable[[float], float]) -> Tuple[float, float]:
        """Prompt user for interval [a, b], or auto-detect if left blank."""
        from .scanner import auto_detect_bracket, find_brackets

        while True:
            text = input("  Enter interval as a,b (e.g. 0,1) [Enter = auto-detect]: ").strip()
            if not text:
                print("    [Auto-Detect] Scanning function domain for root brackets...")
                all_b = find_brackets(f, -10.0, 10.0, steps=200)
                rec = auto_detect_bracket(f, preference="smallest_positive")
                if rec is None:
                    print("    [Auto-Detect] No root bracket found in [-10, 10]. Please enter interval manually.")
                    continue

                if len(all_b) > 1:
                    b_str = ", ".join(f"[{b[0]:g}, {b[1]:g}]" for b in all_b[:5])
                    print(f"    [Auto-Detect] Discovered {len(all_b)} bracket(s): {b_str}")
                print(f"    [Auto-Detect] Auto-selected bracket: [{rec[0]:g}, {rec[1]:g}]")
                return rec[0], rec[1]

            try:
                parts = [float(p) for p in text.split(",")]
                if len(parts) != 2:
                    raise ValueError
                a, b = min(parts), max(parts)
                if a == b:
                    print("    a and b must be distinct numbers.")
                    continue
                fa, fb = f(a), f(b)
                if fa == 0:
                    return a, a
                if fb == 0:
                    return b, b
                if fa * fb > 0:
                    print(f"    Bolzano violated: f({a:g})={fa:+.4g} and f({b:g})={fb:+.4g} have the SAME sign. Choose another bracket.")
                    continue
                return a, b
            except ValueError:
                print("    Invalid input. Enter two comma-separated numbers (e.g. 0,1) or press Enter to auto-detect.")

    def solve(
        self,
        f: Callable[[float], float],
        inputs: Tuple[float, float],
        tol: float,
        max_iter: int = 1000
    ) -> MethodResult:
        a, b = inputs
        initial_desc = f"Initial Bracket [{a:g}, {b:g}]"

        if a == b:
            single_row = IterationRow(
                iteration=1,
                estimate=a,
                f_val=f(a),
                ea=0.0,
                rel_ea=0.0,
                extra_cols={"a": a, "b": b}
            )
            return MethodResult(
                method_name=self.name,
                root=a,
                iterations=1,
                rows=[single_row],
                initial_desc=initial_desc
            )

        rows = []
        prev = None
        for i in range(1, max_iter + 1):
            c = (a + b) / 2.0
            fc = f(c)
            ea = abs(c - prev) if prev is not None else None
            rel_ea = (ea / abs(c)) if (ea is not None and abs(c) > 1e-15) else (float("inf") if ea is not None else None)

            rows.append(IterationRow(
                iteration=i,
                estimate=c,
                f_val=fc,
                ea=ea,
                rel_ea=rel_ea,
                extra_cols={"a": a, "b": b}
            ))

            if abs(fc) < 1e-15 or (rel_ea is not None and rel_ea <= tol):
                break

            if f(a) * fc < 0:
                b = c
            else:
                a = c
            prev = c

        return MethodResult(
            method_name=self.name,
            root=clean_num(rows[-1].estimate),
            iterations=len(rows),
            rows=rows,
            initial_desc=initial_desc
        )

    def get_table_header(self) -> str:
        return f"{'Iter':>5} | {'Lower (a)':>14} | {'Upper (b)':>14} | {'Midpoint (c)':>14} | {'Approx Err (Ea)':>16} | {'Rel Approx (ea)':>22}"

    def format_row(self, row: IterationRow) -> str:
        a = row.extra_cols["a"]
        b = row.extra_cols["b"]
        c = row.estimate
        return f"{row.iteration:>5} | {fmt_val(a)} | {fmt_val(b)} | {fmt_val(c)} | {fmt_ea(row.ea)} | {fmt_rel(row.rel_ea)}"

    def draw_method_plot(
        self,
        ax: matplotlib.axes.Axes,
        f: Callable[[float], float],
        result: MethodResult
    ) -> None:
        """Render Bisection bracket shading and midpoint evolution."""
        a_init = result.rows[0].extra_cols["a"]
        b_init = result.rows[0].extra_cols["b"]

        # Shade initial bracket
        ax.axvspan(a_init, b_init, color="#38BDF8", alpha=0.15, label=f"Bracket [{a_init:g}, {b_init:g}]")

        # Mark endpoints
        try:
            ax.plot(a_init, f(a_init), "s", color="#DC2626", markersize=6, label=f"a = {a_init:g}")
            ax.plot(b_init, f(b_init), "s", color="#059669", markersize=6, label=f"b = {b_init:g}")
        except Exception:
            pass

        # Plot intermediate midpoints on the zero line
        midpoints = [r.estimate for r in result.rows[:-1]]
        if midpoints:
            ax.scatter(midpoints, [0] * len(midpoints), color="#A855F7", s=22, alpha=0.6, zorder=4, label="Midpoints c_k")
