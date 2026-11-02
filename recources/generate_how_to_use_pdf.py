"""
Generate an updated, professionally formatted 'How to Use' PDF guide for Bisection App v2.0.
"""

import matplotlib.pyplot as plt
from matplotlib.backends.backend_pdf import PdfPages
import matplotlib.patches as patches

PDF_FILENAME = "How_To_Use_Bisection_App.pdf"


def setup_page(fig, title, subtitle, page_num, total_pages=3):
    """Draw a clean top header and bottom footer on a figure page."""
    ax = fig.add_axes([0, 0, 1, 1])
    ax.axis('off')
    
    # Top banner
    header_rect = patches.Rectangle((0, 0.915), 1, 0.085, facecolor='#1E293B', transform=ax.transAxes, zorder=1)
    ax.add_patch(header_rect)
    accent_bar = patches.Rectangle((0, 0.910), 1, 0.005, facecolor='#0284C7', transform=ax.transAxes, zorder=1)
    ax.add_patch(accent_bar)
    
    ax.text(0.05, 0.960, title, color='white', fontsize=16, fontweight='bold', transform=ax.transAxes, va='center', zorder=2)
    ax.text(0.05, 0.932, subtitle, color='#94A3B8', fontsize=9.5, transform=ax.transAxes, va='center', zorder=2)
    
    # Bottom footer
    footer_bar = patches.Rectangle((0, 0), 1, 0.035, facecolor='#F1F5F9', transform=ax.transAxes, zorder=1)
    ax.add_patch(footer_bar)
    ax.text(0.05, 0.015, "Bisection Method CLI Application (v2.0) — User Guide", color='#64748B', fontsize=8, transform=ax.transAxes, va='center', zorder=2)
    ax.text(0.95, 0.015, f"Page {page_num} of {total_pages}", color='#64748B', fontsize=8, ha='right', transform=ax.transAxes, va='center', zorder=2)
    
    return ax


def draw_card(ax, x, y, w, h, title=None, bg_color='#F8FAFC', border_color='#CBD5E1', title_color='#0F172A'):
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
    ax = setup_page(fig, "HOW TO USE: QUICK START & WORKFLOW", "Step-by-step guide to finding roots using bisection.py (v2.0)", 1, 3)

    # Card 1: Overview & Launch
    # Position: y=0.74, h=0.15 => top at 0.89, divider at 0.848
    draw_card(ax, 0.05, 0.74, 0.90, 0.15, "1. Launching the Application", bg_color='#FFFFFF', border_color='#93C5FD')
    ax.text(0.07, 0.825, "• Open your terminal and run the script with Python:", fontsize=9, color='#1E293B', transform=ax.transAxes, va='top', zorder=2)
    
    term_box = patches.FancyBboxPatch((0.07, 0.755), 0.86, 0.042, boxstyle="round,pad=0.005", facecolor='#1E293B', edgecolor='#334155', transform=ax.transAxes, zorder=2)
    ax.add_patch(term_box)
    ax.text(0.09, 0.776, "$ python bisection.py", color='#38BDF8', fontfamily='monospace', fontsize=9.5, fontweight='bold', transform=ax.transAxes, va='center', zorder=3)

    # Card 2: 4-Step Input Sequence
    # Position: y=0.25, h=0.46 => top at 0.71, divider at 0.668
    draw_card(ax, 0.05, 0.25, 0.90, 0.46, "2. The 4-Step Input Process", bg_color='#FFFFFF', border_color='#94A3B8')

    steps = [
        ("Step A: Enter Function f(x)", 
         "Type your mathematical expression in terms of 'x'.\n"
         "Examples: 2x + sin(x),  x^2 - 2,  exp(x) - 3x,  x^3 - 7x + 1\n"
         "• Use '^' for powers. Implicit multiplication works naturally (e.g. 2x, 2sin(x)).", 0.640, '#0284C7'),
        
        ("Step B: Enter Interval [a, b]", 
         "Enter two comma-separated numbers: a,b (e.g. -1,10 or 0,1).\n"
         "• The app enforces Bolzano's Theorem: f(a) and f(b) MUST have opposite signs.\n"
         "• If an endpoint is already an exact root, it finishes immediately!", 0.540, '#0D9488'),
        
        ("Step C: Enter Relative Error Tolerance", 
         "Specify the stopping tolerance for Relative Approximate Error (ea <= tol).\n"
         "• Examples: 0.000001 or 0.0001% (Press Enter to use default: 0.0001% = 1e-6).\n"
         "• The method halts automatically once the relative shift falls below this threshold.", 0.440, '#D97706'),

        ("Step D: Optional Known True Root (Analysis Tool)", 
         "Enter known exact root if you want to benchmark accuracy (e.g. 0, sqrt(2)) [Enter = skip].\n"
         "• If provided, the app computes both Absolute Exact Error (Et) and\n"
         "  Relative Exact Error (et) in the final summary report!", 0.340, '#7C3AED')
    ]

    for title, desc, y_pos, bullet_col in steps:
        bullet = patches.Circle((0.075, y_pos - 0.005), 0.009, facecolor=bullet_col, edgecolor='none', transform=ax.transAxes, zorder=2)
        ax.add_patch(bullet)
        ax.text(0.095, y_pos - 0.005, title, fontsize=9.5, fontweight='bold', color='#0F172A', transform=ax.transAxes, va='center', zorder=2)
        ax.text(0.095, y_pos - 0.020, desc, fontsize=8.0, color='#334155', transform=ax.transAxes, va='top', linespacing=1.2, zorder=2)

    # Card 3: Interactive Loop
    # Position: y=0.05, h=0.17 => top at 0.22, divider at 0.178
    draw_card(ax, 0.05, 0.05, 0.90, 0.17, "3. Iteration Table & Interactive Session Loop", bg_color='#FFFFFF', border_color='#94A3B8')
    ax.text(0.07, 0.160, "• Prints a clean 6-column iteration table (tracking bounds, midpoint, Ea, and ea).", fontsize=8.5, color='#334155', transform=ax.transAxes, va='top', zorder=2)
    ax.text(0.07, 0.138, "• Final summary reports original function, range, tolerance, root, and error types.", fontsize=8.5, color='#334155', transform=ax.transAxes, va='top', zorder=2)
    ax.text(0.07, 0.116, "• Automatic prompt asks whether to generate and display the 2-panel graphical plot!", fontsize=8.5, color='#334155', transform=ax.transAxes, va='top', zorder=2)
    
    prompt_box = patches.FancyBboxPatch((0.07, 0.058), 0.86, 0.038, boxstyle="round,pad=0.004", facecolor='#F8FAFC', edgecolor='#CBD5E1', transform=ax.transAxes, zorder=2)
    ax.add_patch(prompt_box)
    ax.text(0.09, 0.077, "Press Enter to solve another (or 'q' to quit) | Enter 'n' to skip plot generation", fontfamily='monospace', fontsize=7.8, color='#0F172A', transform=ax.transAxes, va='center', zorder=3)

    pdf.savefig(fig)
    plt.close()


def build_page_2(pdf):
    fig = plt.figure(figsize=(8.5, 11), dpi=300)
    ax = setup_page(fig, "SYNTAX GUIDE & THE 4 NUMERICAL ERRORS", "Expression reference and error classification", 2, 3)

    # Card 1: Math Syntax Table
    # Position: y=0.55, h=0.34 => top at 0.89, divider at 0.848
    draw_card(ax, 0.05, 0.55, 0.90, 0.34, "Mathematical Operators & Functions", bg_color='#FFFFFF', border_color='#94A3B8')

    table_data = [
        ["Category", "Syntax Example", "Interpretation / Description"],
        ["Powers", "x^2 - 2,  x^3 + 4", "Caret '^' automatically converts to Python's '**' operator."],
        ["Implicit Multi.", "2x,  2sin(x),  3(x+1)", "Numbers/variables preceding functions/brackets auto-insert '*'."],
        ["Trigonometric", "sin(x),  cos(2x),  tan(x)", "Standard radian trigonometry functions."],
        ["Exponential", "exp(x),  exp(-x^2)", "Natural exponential e^x."],
        ["Logarithmic", "log(x),  log10(x)", "log(x) is natural ln(x). log10(x) is common base-10 log."],
        ["Constants", "pi,  e,  tau", "pi ~ 3.14159, e ~ 2.71828."],
        ["Scientific Not.", "1e-5,  2.5e3", "Preserved cleanly without unwanted multiplication asterisks."]
    ]

    t = ax.table(
        cellText=table_data[1:],
        colLabels=table_data[0],
        colWidths=[0.20, 0.28, 0.52],
        loc='center',
        bbox=[0.065, 0.565, 0.87, 0.26]
    )
    t.auto_set_font_size(False)
    t.set_fontsize(7.5)
    t.set_zorder(10)

    for col_idx in range(3):
        cell = t[(0, col_idx)]
        cell.set_facecolor('#1E293B')
        cell.get_text().set_color('white')
        cell.get_text().set_weight('bold')
        cell.set_zorder(10)

    for row_idx in range(1, len(table_data)):
        for col_idx in range(3):
            cell = t[(row_idx, col_idx)]
            cell.set_edgecolor('#E2E8F0')
            cell.set_facecolor('#F8FAFC' if row_idx % 2 == 1 else '#FFFFFF')
            cell.set_zorder(10)

    # Card 2: The 4 Types of Numerical Errors
    # Position: y=0.17, h=0.36 => top at 0.53, divider at 0.488
    draw_card(ax, 0.05, 0.17, 0.90, 0.36, "Understanding the 4 Types of Errors", bg_color='#FFFFFF', border_color='#86EFAC')

    errors = [
        ("1. Relative Approx Error (ea) [STOPPING CRITERION]", "|c_curr - c_prev| / |c_curr|",
         "The sole convergence stopping criterion! Halts iterations when ea <= tolerance.\n"
         "Displayed in table column 'Rel Approx (ea)'."),
        
        ("2. Absolute Approx Error (Ea) [ANALYSIS TOOL]", "|c_curr - c_prev|",
         "Measures the absolute step shift between consecutive midpoints.\n"
         "Displayed in table column 'Approx Err (Ea)'."),
        
        ("3. Absolute Exact Error (Et) [ANALYSIS TOOL]", "|x_true - c|",
         "The true physical distance to the exact root. Reported in the final summary if true root is provided."),
        
        ("4. Relative Exact Error (et) [ANALYSIS TOOL]", "|x_true - c| / |x_true|",
         "The exact error normalized by the true root. (Undefined if true root is 0 due to division by zero).")
    ]

    y_err = 0.465
    for name, form, desc in errors:
        ax.text(0.07, y_err, f"• {name}:", fontweight='bold', fontsize=8.2, color='#047857', transform=ax.transAxes, va='top', zorder=2)
        ax.text(0.58, y_err, form, fontweight='bold', fontfamily='monospace', fontsize=8.0, color='#0F172A', transform=ax.transAxes, va='top', zorder=2)
        ax.text(0.09, y_err - 0.022, desc, fontsize=7.6, color='#334155', transform=ax.transAxes, va='top', linespacing=1.2, zorder=2)
        y_err -= 0.068

    # Card 3: Pro-Tip
    # Position: y=0.04, h=0.11 => top at 0.15, no title
    draw_card(ax, 0.05, 0.04, 0.90, 0.11, None, bg_color='#FFFBEB', border_color='#FCD34D')
    ax.text(0.075, 0.125, "Relative Error as the Standard Stopping Rule:", fontweight='bold', fontsize=8.5, color='#92400E', transform=ax.transAxes, va='top', zorder=2)
    ax.text(0.075, 0.100, "Relative approximate error ensures that stopping is scale-invariant (e.g. 0.0001% accuracy works\n"
                          "equally well whether the root is 1.414 or 14,000). The other 3 errors give you full analytical insight!",
            fontsize=7.8, color='#78350F', transform=ax.transAxes, va='top', linespacing=1.2, zorder=2)

    pdf.savefig(fig)
    plt.close()


def build_page_3(pdf):
    fig = plt.figure(figsize=(8.5, 11), dpi=300)
    ax = setup_page(fig, "GRAPHICAL PLOTS & SUMMARY CARD", "2-panel visualization, banners, and results card", 3, 3)

    # Card 1: 2-Panel Graphical Plot
    # Position: y=0.55, h=0.34 => top at 0.89, divider at 0.848
    draw_card(ax, 0.05, 0.55, 0.90, 0.34, "2-Panel Graphical Convergence Plot (PNG Export)", bg_color='#FFFFFF', border_color='#93C5FD')
    ax.text(0.07, 0.825, "After each run, the application can generate a publication-quality 2-panel chart (bisection_plot.png):", fontsize=8.5, color='#1E293B', transform=ax.transAxes, va='top', zorder=2)

    plot_bullets = [
        ("Left Panel: Root Localization", "Plots the continuous function curve f(x), shades the initial bracket [a, b], marks\n"
                                           "the endpoints a and b, displays intermediate midpoints c_k, and highlights the root with a star."),
        ("Right Panel: Error Decay Curve", "Plots Relative Approximate Error (ea) and Absolute Approximate Error (Ea) vs. iteration\n"
                                           "on a logarithmic scale against the dotted red tolerance line, annotating the stopping step."),
        ("Interactive GUI & File Export", "Automatically saves high-resolution bisection_plot.png (200 DPI) and displays an\n"
                                          "interactive desktop window that can be zoomed, panned, or saved.")
    ]
    y_pl = 0.775
    for title, desc in plot_bullets:
        ax.text(0.075, y_pl, f"• {title}:", fontweight='bold', fontsize=8.2, color='#0284C7', transform=ax.transAxes, va='top', zorder=2)
        ax.text(0.095, y_pl - 0.020, desc, fontsize=7.6, color='#334155', transform=ax.transAxes, va='top', linespacing=1.2, zorder=2)
        y_pl -= 0.065

    # Card 2: Summary Card Breakdown
    # Position: y=0.17, h=0.36 => top at 0.53, divider at 0.488
    draw_card(ax, 0.05, 0.17, 0.90, 0.36, "Convergence Summary with Problem Context", bg_color='#FFFFFF', border_color='#94A3B8')

    summary_sample = """+====================================================================================================+
|                              3. CONVERGENCE SUMMARY & ERROR ANALYSIS                               |
+====================================================================================================+
  Problem Specification:
    * Function f(x)       : x^3 - 7x + 1
    * Initial Range [a, b]: [0, 1]
    * Error Tolerance     : 0.001 (0.1%)
    * Stopping Criterion  : Relative Approximate Error (ea <= tolerance)

  Solution Results:
    * Approximate Root (c): 0.1431884766
    * Function Value f(c) : +6.164488e-04  (effectively zero)
    * Iterations Required : 13
    * Termination Reason  : Reached relative tolerance or exact root

  Error Analysis (4 Numerical Errors):
    1. Relative Approx Error (ea) [Stopping Metric]: 8.5251e-04 (8.5251e-02%)
    2. Absolute Approx Error (Ea)                 : 1.220703e-04
    3. Absolute Exact Error  (Et = |x_true - c|)  : 8.884344e-05
    4. Relative Exact Error  (et = |x_true - c|/|x_t|): 6.2008e-04 (6.2008e-02%)
+====================================================================================================+"""

    sum_box = patches.FancyBboxPatch((0.065, 0.185), 0.87, 0.285, boxstyle="round,pad=0.005", facecolor='#F8FAFC', edgecolor='#CBD5E1', transform=ax.transAxes, zorder=2)
    ax.add_patch(sum_box)
    ax.text(0.08, 0.327, summary_sample, color='#0F172A', fontfamily='monospace', fontsize=5.8, transform=ax.transAxes, va='center', zorder=3)

    # Card 3: Summary Note
    # Position: y=0.04, h=0.11 => top at 0.15, no title
    draw_card(ax, 0.05, 0.04, 0.90, 0.11, None, bg_color='#EFF6FF', border_color='#BFDBFE')
    ax.text(0.075, 0.125, "Visual Verification Made Simple:", fontweight='bold', fontsize=8.5, color='#1D4ED8', transform=ax.transAxes, va='top', zorder=2)
    ax.text(0.075, 0.100, "The combination of standardized banners, adaptive terminal tables, and high-resolution 2-panel\nplots gives you total confidence in your numerical solution from both an algebraic and visual perspective!",
            fontsize=7.8, color='#1E40AF', transform=ax.transAxes, va='top', linespacing=1.2, zorder=2)

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
