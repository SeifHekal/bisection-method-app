"""
Generate an intuitive, illustrated 'Bisection Method Explained' educational PDF (v2.0).
"""

import matplotlib.pyplot as plt
from matplotlib.backends.backend_pdf import PdfPages
import matplotlib.patches as patches
import numpy as np

PDF_FILENAME = "Bisection_Method_Explained.pdf"


def setup_page(fig, title, subtitle, page_num, total_pages=3):
    """Draw standard header and footer."""
    ax = fig.add_axes([0, 0, 1, 1])
    ax.axis('off')
    
    # Header banner
    header_rect = patches.Rectangle((0, 0.915), 1, 0.085, facecolor='#0F172A', transform=ax.transAxes, zorder=1)
    ax.add_patch(header_rect)
    accent_bar = patches.Rectangle((0, 0.910), 1, 0.005, facecolor='#10B981', transform=ax.transAxes, zorder=1)
    ax.add_patch(accent_bar)
    
    ax.text(0.05, 0.960, title, color='white', fontsize=16, fontweight='bold', transform=ax.transAxes, va='center', zorder=2)
    ax.text(0.05, 0.932, subtitle, color='#94A3B8', fontsize=9.5, transform=ax.transAxes, va='center', zorder=2)
    
    # Footer bar
    footer_bar = patches.Rectangle((0, 0), 1, 0.035, facecolor='#F8FAFC', transform=ax.transAxes, zorder=1)
    ax.add_patch(footer_bar)
    ax.text(0.05, 0.015, "Numerical Analysis Guide — The Bisection Method Explained (v2.0)", color='#64748B', fontsize=8, transform=ax.transAxes, va='center', zorder=2)
    ax.text(0.95, 0.015, f"Page {page_num} of {total_pages}", color='#64748B', fontsize=8, ha='right', transform=ax.transAxes, va='center', zorder=2)
    
    return ax


def draw_card(ax, x, y, w, h, title=None, bg_color='#FFFFFF', border_color='#CBD5E1', title_color='#0F172A'):
    """Draw a rounded content card box with header and divider."""
    box = patches.FancyBboxPatch(
        (x, y), w, h,
        boxstyle="round,pad=0.012,rounding_size=0.015",
        facecolor=bg_color, edgecolor=border_color, linewidth=1.2,
        transform=ax.transAxes, zorder=1
    )
    ax.add_patch(box)
    if title:
        title_y = y + h - 0.025
        div_y = y + h - 0.042
        ax.text(x + 0.02, title_y, title, color=title_color, fontsize=11, fontweight='bold', transform=ax.transAxes, va='top', zorder=2)
        ax.plot([x + 0.02, x + w - 0.02], [div_y, div_y], color=border_color, linewidth=0.8, transform=ax.transAxes, zorder=2)


def build_page_1(pdf):
    fig = plt.figure(figsize=(8.5, 11), dpi=300)
    ax_bg = setup_page(fig, "WHAT IS THE BISECTION METHOD?", "Intuition, root-finding concepts, and Bolzano's Theorem", 1, 3)

    # Card 1: Core Concept & Intuition
    # Position: y=0.69, h=0.20 => top at 0.89, divider at 0.848
    draw_card(ax_bg, 0.05, 0.69, 0.90, 0.20, "1. The Big Idea: Binary Search for Continuous Math", border_color='#93C5FD')
    ax_bg.text(0.07, 0.825, "• The Problem: In engineering and science, equations like 2x + sin(x) = 0 or x*e^x = 2 cannot\n"
                            "  be solved with simple algebra. We must find the roots numerically.",
               fontsize=8.5, color='#1E293B', transform=ax_bg.transAxes, va='top', linespacing=1.25, zorder=2)
    ax_bg.text(0.07, 0.772, "• The Analogy: Think of the classic High-Low number guessing game. If someone thinks of a number\n"
                            "  between 1 and 100, your best first guess is 50. If they say 'too high', you know it's in [1, 50].\n"
                            "  The Bisection Method applies this exact halving strategy to continuous mathematical functions!",
               fontsize=8.5, color='#1E293B', transform=ax_bg.transAxes, va='top', linespacing=1.25, zorder=2)
    ax_bg.text(0.07, 0.710, "• A 'Root' (or zero) is simply the x-value where the curve crosses the horizontal axis: f(x) = 0.",
               fontsize=8.5, fontweight='bold', color='#0369A1', transform=ax_bg.transAxes, va='top', zorder=2)

    # Card 2: Bolzano's Theorem with embedded diagram
    # Position: y=0.17, h=0.50 => top at 0.67, divider at 0.628
    draw_card(ax_bg, 0.05, 0.17, 0.90, 0.50, "2. Theoretical Guarantee: Bolzano's Theorem", border_color='#86EFAC')
    ax_bg.text(0.07, 0.610, "If a continuous function f(x) has opposite signs at endpoints a and b:",
               fontsize=9, color='#1E293B', transform=ax_bg.transAxes, va='top', zorder=2)
    ax_bg.text(0.32, 0.582, "f(a) · f(b) < 0",
               fontsize=11, fontweight='bold', color='#047857', transform=ax_bg.transAxes, va='top', zorder=2)
    ax_bg.text(0.07, 0.552, "then the curve MUST cross the horizontal axis at least once between a and b.\n"
                            "A root is 100% guaranteed to exist inside the bracket [a, b]!",
               fontsize=8.5, color='#334155', transform=ax_bg.transAxes, va='top', linespacing=1.2, zorder=2)

    # Embedded Plot: Bolzano's Theorem
    # Y range: 0.20 to 0.485 (height 0.285)
    ax_plot = fig.add_axes([0.10, 0.20, 0.80, 0.285], zorder=10)
    x_vals = np.linspace(0.5, 2.5, 300)
    y_vals = x_vals**2 - 2  # Root at sqrt(2) ~ 1.4142

    ax_plot.plot(x_vals, y_vals, color='#1E40AF', linewidth=2.2, label='f(x) = x² - 2')
    ax_plot.axhline(0, color='#64748B', linewidth=1.2, linestyle='--')
    
    a, b = 0.8, 2.2
    fa, fb = a**2 - 2, b**2 - 2
    root = np.sqrt(2)

    ax_plot.plot(a, fa, 'o', color='#DC2626', markersize=7, label=f'a = {a} (f(a) < 0, Negative)')
    ax_plot.plot(b, fb, 'o', color='#059669', markersize=7, label=f'b = {b} (f(b) > 0, Positive)')
    ax_plot.plot(root, 0, '*', color='#D97706', markersize=13, label='True Root r = √2 ≈ 1.414')

    ax_plot.vlines(a, 0, fa, color='#DC2626', linestyle=':')
    ax_plot.vlines(b, 0, fb, color='#059669', linestyle=':')

    ax_plot.set_title("Bolzano's Sign Change Guarantee: f(a) < 0 and f(b) > 0 ⇒ Root in (a, b)", fontsize=9, fontweight='bold', pad=7)
    ax_plot.set_xlabel("x", fontsize=8.5)
    ax_plot.set_ylabel("f(x)", fontsize=8.5)
    ax_plot.legend(loc='upper left', fontsize=7.5, framealpha=0.9)
    ax_plot.grid(True, linestyle=':', alpha=0.6)

    # Card 3: Summary Takeaway
    # Position: y=0.04, h=0.11 => top at 0.15, no title
    draw_card(ax_bg, 0.05, 0.04, 0.90, 0.11, None, bg_color='#F0FDF4', border_color='#BBF7D0')
    ax_bg.text(0.075, 0.125, "Key Takeaway for Bisection:", fontweight='bold', fontsize=8.5, color='#166534', transform=ax_bg.transAxes, va='top', zorder=2)
    ax_bg.text(0.075, 0.100, "Whenever you can trap a root between a positive point and a negative point,\nthe Bisection Method will never fail — it is globally convergent for all continuous functions.",
               fontsize=8, color='#14532D', transform=ax_bg.transAxes, va='top', linespacing=1.2, zorder=2)

    pdf.savefig(fig)
    plt.close()


def build_page_2(pdf):
    fig = plt.figure(figsize=(8.5, 11), dpi=300)
    ax_bg = setup_page(fig, "HOW THE ALGORITHM WORKS", "The 4-step interval halving cycle step-by-step", 2, 3)

    # Card 1: 4-Step Repeating Loop
    # Position: y=0.67, h=0.22 => top at 0.89, divider at 0.848
    draw_card(ax_bg, 0.05, 0.67, 0.90, 0.22, "1. The 4-Step Iteration Loop", border_color='#93C5FD')
    
    loop_steps = [
        ("Step 1: Midpoint", "Calculate the center of the current bracket:  c = (a + b) / 2"),
        ("Step 2: Evaluate", "Compute f(c). If f(c) == 0 (or |f(c)| < 1e-15), c is an exact root!"),
        ("Step 3: Contract", "Check sign of f(a) · f(c):\n"
                             "• If f(a) · f(c) < 0: The root is in the LEFT half. Replace b = c.\n"
                             "• If f(a) · f(c) > 0: The root is in the RIGHT half. Replace a = c."),
        ("Step 4: Check Error", "If Relative Approximate Error ea = |c_curr - c_prev| / |c_curr| ≤ tol: STOP. Else repeat!")
    ]
    y_lp = 0.825
    for title, desc in loop_steps:
        ax_bg.text(0.07, y_lp, f"▶  {title}:", fontweight='bold', fontsize=8.2, color='#0284C7', transform=ax_bg.transAxes, va='top', zorder=2)
        ax_bg.text(0.28, y_lp, desc, fontsize=8.0, color='#334155', transform=ax_bg.transAxes, va='top', linespacing=1.2, zorder=2)
        y_lp -= 0.038

    # Card 2: Visual Halving Stages Diagram
    # Position: y=0.26, h=0.39 => top at 0.65, divider at 0.608
    draw_card(ax_bg, 0.05, 0.26, 0.90, 0.39, "2. Visual Walkthrough: Solving x² - 2 = 0 on [1, 2]", border_color='#86EFAC')

    ax_diagram = fig.add_axes([0.08, 0.28, 0.84, 0.30], zorder=10)
    ax_diagram.axis('off')

    stages = [
        ("Iteration 1", 1.0, 2.0, 1.5, "f(1)=-1 < 0,  f(2)=+2 > 0\nMidpoint c₁ = 1.5 (f(1.5)=+0.25 > 0)\nOpposite signs on [1, 1.5] -> b = 1.5", 0.78),
        ("Iteration 2", 1.0, 1.5, 1.25, "New bracket [1, 1.5] (width cut to 0.5)\nMidpoint c₂ = 1.25 (f(1.25)=-0.4375 < 0)\nOpposite signs on [1.25, 1.5] -> a = 1.25", 0.46),
        ("Iteration 3", 1.25, 1.5, 1.375, "New bracket [1.25, 1.5] (width cut to 0.25)\nMidpoint c₃ = 1.375 (f(1.375)=-0.109 < 0)\nHoming closer to √2 ≈ 1.4142...", 0.14),
    ]

    for label, a_val, b_val, c_val, note, y_pos in stages:
        ax_diagram.text(0.02, y_pos + 0.07, label, fontsize=8.8, fontweight='bold', color='#1E293B', transform=ax_diagram.transAxes, va='center')
        
        def map_x(val):
            return 0.15 + (val - 0.8) / 1.4 * 0.50

        ax_diagram.plot([map_x(0.8), map_x(2.2)], [y_pos, y_pos], color='#CBD5E1', linewidth=1.5, transform=ax_diagram.transAxes)
        ax_diagram.plot([map_x(a_val), map_x(b_val)], [y_pos, y_pos], color='#3B82F6', linewidth=3.5, transform=ax_diagram.transAxes)
        ax_diagram.plot(map_x(a_val), y_pos, 's', color='#DC2626', markersize=6.5, transform=ax_diagram.transAxes)
        ax_diagram.plot(map_x(b_val), y_pos, 's', color='#059669', markersize=6.5, transform=ax_diagram.transAxes)
        ax_diagram.plot(map_x(c_val), y_pos, '^', color='#F59E0B', markersize=8.5, transform=ax_diagram.transAxes)
        ax_diagram.plot(map_x(np.sqrt(2)), y_pos, '*', color='#7C3AED', markersize=7.5, transform=ax_diagram.transAxes)

        ax_diagram.text(map_x(a_val), y_pos - 0.065, f"a={a_val:g}", ha='center', fontsize=7.2, color='#DC2626', transform=ax_diagram.transAxes, va='top')
        ax_diagram.text(map_x(b_val), y_pos - 0.065, f"b={b_val:g}", ha='center', fontsize=7.2, color='#059669', transform=ax_diagram.transAxes, va='top')
        ax_diagram.text(map_x(c_val), y_pos + 0.045, f"c={c_val:g}", ha='center', fontsize=7.2, fontweight='bold', color='#D97706', transform=ax_diagram.transAxes, va='bottom')
        ax_diagram.text(0.70, y_pos + 0.06, note, fontsize=7.2, color='#475569', transform=ax_diagram.transAxes, va='top', linespacing=1.2)

    # Card 3: Key Properties Box
    # Position: y=0.04, h=0.20 => top at 0.24, divider at 0.198
    draw_card(ax_bg, 0.05, 0.04, 0.90, 0.20, "3. Why Interval Halving is Remarkable", border_color='#FCD34D', bg_color='#FFFBEB')
    ax_bg.text(0.07, 0.180, "• Predictable Convergence: Each step halves the interval width:  Width_n = (b - a) / 2^n", fontsize=8.5, fontweight='bold', color='#92400E', transform=ax_bg.transAxes, va='top', zorder=2)
    ax_bg.text(0.07, 0.148, "• In just 10 iterations, the interval shrinks by 2^10 = 1,024 (over 1,000x smaller!).", fontsize=8.0, color='#78350F', transform=ax_bg.transAxes, va='top', zorder=2)
    ax_bg.text(0.07, 0.120, "• In 20 iterations, the interval shrinks by 2^20 = 1,048,576 (over one million times smaller!).", fontsize=8.0, color='#78350F', transform=ax_bg.transAxes, va='top', zorder=2)
    ax_bg.text(0.07, 0.092, "• Guaranteed: Unlike Newton's method, it never diverges or shoots off if a root is bracketed.", fontsize=8.0, fontweight='bold', color='#15803D', transform=ax_bg.transAxes, va='top', zorder=2)

    pdf.savefig(fig)
    plt.close()


def build_page_3(pdf):
    fig = plt.figure(figsize=(8.5, 11), dpi=300)
    ax_bg = setup_page(fig, "THE 4 TYPES OF NUMERICAL ERRORS", "Definitions, exact vs approximate, and analysis roles", 3, 3)

    # Card 1: The 4 Error Types Deep Dive
    # Position: y=0.57, h=0.32 => top at 0.89, divider at 0.848
    draw_card(ax_bg, 0.05, 0.57, 0.90, 0.32, "1. Definitions & Mathematical Formulas", border_color='#93C5FD')
    
    error_defs = [
        ("Relative Approx Error (ea):", "|c_curr - c_prev| / |c_curr|",
         "The sole convergence stopping criterion! Halts as soon as ea <= tolerance.\n"
         "Normalizes the step shift relative to the current estimate for scale-invariance."),
        
        ("Absolute Approx Error (Ea):", "|c_curr - c_prev|",
         "Analysis Tool: The raw step shift between consecutive midpoints. Always computable."),
        
        ("Absolute Exact Error (Et):", "|x_true - c|",
         "Analysis Tool: The true physical distance to the exact root. Reported in the summary."),
        
        ("Relative Exact Error (et):", "|x_true - c| / |x_true|",
         "Analysis Tool: The exact error normalized by the true root. (Undefined if true root = 0).")
    ]
    y_ed = 0.825
    for label, form, desc in error_defs:
        ax_bg.text(0.07, y_ed, f"• {label}", fontweight='bold', fontsize=8.2, color='#0284C7', transform=ax_bg.transAxes, va='top', zorder=2)
        ax_bg.text(0.48, y_ed, form, fontweight='bold', fontfamily='monospace', fontsize=8.0, color='#0F172A', transform=ax_bg.transAxes, va='top', zorder=2)
        ax_bg.text(0.09, y_ed - 0.020, desc, fontsize=7.4, color='#475569', transform=ax_bg.transAxes, va='top', linespacing=1.2, zorder=2)
        y_ed -= 0.065

    # Card 2: Stopping vs Analysis Roles
    # Position: y=0.29, h=0.26 => top at 0.55, divider at 0.508
    draw_card(ax_bg, 0.05, 0.29, 0.90, 0.26, "2. Architecture: Stopping Criterion vs Analysis Tools", border_color='#F59E0B', bg_color='#FFFBEB')
    ax_bg.text(0.07, 0.490, "Why Relative Approximate Error is the Stopping Criterion while others are Analysis Tools:", fontsize=8.2, color='#78350F', transform=ax_bg.transAxes, va='top', zorder=2)
    ax_bg.text(0.07, 0.458, "• Scale-Invariant Stopping (ea <= tol):", fontweight='bold', fontsize=8.2, color='#B45309', transform=ax_bg.transAxes, va='top', zorder=2)
    ax_bg.text(0.09, 0.435, "Whether finding a tiny root like r = 0.0012 or an astronomical one like r = 1,200,000,\n"
                            "a relative tolerance (e.g. 0.0001%) guarantees 6 significant digits of precision without\n"
                            "requiring manual rescaling of the tolerance.",
               fontsize=7.6, color='#92400E', transform=ax_bg.transAxes, va='top', linespacing=1.2, zorder=2)
    ax_bg.text(0.07, 0.370, "• The Role of the Analysis Tools (Ea, Et, et):", fontweight='bold', fontsize=8.2, color='#047857', transform=ax_bg.transAxes, va='top', zorder=2)
    ax_bg.text(0.09, 0.347, "Approximate Error (Ea) shows raw step convergence in the table.\n"
                            "Exact errors (Et, et) give instant benchmarking against analytical solutions whenever\n"
                            "the true root is provided in the optional prompt!",
               fontsize=7.6, color='#14532D', transform=ax_bg.transAxes, va='top', linespacing=1.2, zorder=2)

    # Card 3: Summary Comparison Table
    # Position: y=0.04, h=0.23 => top at 0.27, divider at 0.228
    draw_card(ax_bg, 0.05, 0.04, 0.90, 0.23, "3. Summary: Error Comparison Matrix", border_color='#94A3B8')
    
    summary_data = [
        ["Error Type", "Role in App", "Requires Exact Root?", "Key Benefit"],
        ["Relative Approx (ea)", "Stopping Criterion", "No", "Scale-invariant precision across all problem domains."],
        ["Absolute Approx (Ea)", "Analysis Tool (Table)", "No", "Direct measurement of midpoint movement step size."],
        ["Absolute Exact (Et)", "Analysis Tool (Summary)", "Yes (Optional)", "True benchmark distance to analytical solution."],
        ["Relative Exact (et)", "Analysis Tool (Summary)", "Yes (Optional)", "Percentage accuracy relative to the true answer."]
    ]
    t = ax_bg.table(
        cellText=summary_data[1:],
        colLabels=summary_data[0],
        colWidths=[0.21, 0.22, 0.17, 0.40],
        loc='center',
        bbox=[0.065, 0.055, 0.87, 0.15]
    )
    t.auto_set_font_size(False)
    t.set_fontsize(6.8)
    t.set_zorder(10)

    for col_idx in range(4):
        cell = t[(0, col_idx)]
        cell.set_facecolor('#1E293B')
        cell.get_text().set_color('white')
        cell.get_text().set_weight('bold')
        cell.set_zorder(10)

    for row_idx in range(1, len(summary_data)):
        for col_idx in range(4):
            cell = t[(row_idx, col_idx)]
            cell.set_edgecolor('#E2E8F0')
            cell.set_facecolor('#F8FAFC' if row_idx % 2 == 1 else '#FFFFFF')
            cell.set_zorder(10)

    pdf.savefig(fig)
    plt.close()


def main():
    print(f"Generating {PDF_FILENAME}...")
    with PdfPages(PDF_FILENAME) as pdf:
        build_page_1(pdf)
        build_page_2(pdf)
        build_page_3(pdf)
    print(f"Successfully generated {PDF_FILENAME}!")


if __name__ == "__main__":
    main()
