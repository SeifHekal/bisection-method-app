"""
Generate an easy-to-understand, human, straightforward presentation slide deck
aligned with the course lecture notes (CCS3002 Numerical Methods Lecture 1) and
bridging it directly to the Python CLI solver app.
"""

import matplotlib.pyplot as plt
from matplotlib.backends.backend_pdf import PdfPages
import matplotlib.patches as patches
import numpy as np

PDF_FILENAME = "Bisection_Method_Presentation.pdf"

# Clean academic lecture palette matching the course slides
PAGE_BG = "#FFFDF9"      # Warm ivory lecture background
HEADER_RED = "#B91C1C"   # Deep lecture crimson (like the "INTRODUCTION" title)
DARK_TEXT = "#1E293B"    # Dark slate text
MUTED_TEXT = "#475569"   # Readable secondary text
ACCENT_BLUE = "#0284C7"  # Clean sky blue
BOX_BG = "#FFFFFF"       # White card backgrounds
BORDER_COL = "#E2E8F0"   # Subtle light border
GREEN_SIGN = "#059669"   # Positive sign green
RED_SIGN = "#DC2626"     # Negative sign red


def setup_slide(fig, slide_num, title, subtitle=None, total_slides=10):
    """Draw a clean, human, lecture-style slide header and footer."""
    ax = fig.add_axes([0, 0, 1, 1])
    ax.axis('off')
    
    # Warm soft background
    bg = patches.Rectangle((0, 0), 1, 1, facecolor=PAGE_BG, transform=ax.transAxes, zorder=0)
    ax.add_patch(bg)
    
    # Top lecture title in clean crimson
    ax.text(0.06, 0.925, title, fontsize=20, fontweight='bold', color=HEADER_RED, transform=ax.transAxes, va='center', zorder=2)
    # Underline bar
    ax.plot([0.06, 0.94], [0.885, 0.885], color="#FCA5A5", linewidth=1.5, transform=ax.transAxes, zorder=2)
    
    if subtitle:
        ax.text(0.06, 0.855, subtitle, fontsize=10.5, color=MUTED_TEXT, transform=ax.transAxes, va='center', zorder=2)

    # Footer
    ax.text(0.06, 0.03, "CCS3002 Numerical Methods — Bisection Method & Solver Guide", fontsize=8.5, color="#94A3B8", transform=ax.transAxes, va='center', zorder=2)
    ax.text(0.94, 0.03, f"{slide_num} / {total_slides}", fontsize=8.5, color="#94A3B8", ha='right', transform=ax.transAxes, va='center', zorder=2)
    
    return ax


def draw_card(ax, x, y, w, h, bg_color=BOX_BG, border_color=BORDER_COL, zorder=1):
    """Draw a rounded content card box."""
    box = patches.FancyBboxPatch(
        (x, y), w, h,
        boxstyle="round,pad=0.015,rounding_size=0.015",
        facecolor=bg_color, edgecolor=border_color, linewidth=1.2,
        transform=ax.transAxes, zorder=zorder
    )
    ax.add_patch(box)
    return box


# ==========================================
# SLIDE 1: TITLE SLIDE
# ==========================================
def slide_1_title(pdf):
    fig = plt.figure(figsize=(13.333, 7.5), dpi=300)
    ax = fig.add_axes([0, 0, 1, 1])
    ax.axis('off')
    
    bg = patches.Rectangle((0, 0), 1, 1, facecolor=PAGE_BG, transform=ax.transAxes, zorder=0)
    ax.add_patch(bg)

    # Course tag
    ax.text(0.50, 0.82, "CCS3002: NUMERICAL METHODS", fontsize=15, fontweight='bold', color="#64748B", ha='center', va='center', transform=ax.transAxes, zorder=2)
    
    # Main Title
    ax.text(0.50, 0.70, "The Bisection Method", fontsize=32, fontweight='bold', color=HEADER_RED, ha='center', va='center', transform=ax.transAxes, zorder=2)
    ax.plot([0.30, 0.70], [0.64, 0.64], color=HEADER_RED, linewidth=2.5, transform=ax.transAxes, zorder=2)

    # Subtitle
    ax.text(0.50, 0.57, "How We Find Roots Step-by-Step (Theory & Python App)", fontsize=14, color=DARK_TEXT, ha='center', va='center', transform=ax.transAxes, zorder=2)

    # Quick 3 bullet overview card
    card = draw_card(ax, 0.18, 0.15, 0.64, 0.32, bg_color="#FFFFFF", border_color="#CBD5E1")
    ax.text(0.22, 0.40, "In this presentation, we will cover:", fontsize=12, fontweight='bold', color=DARK_TEXT, transform=ax.transAxes, va='top', zorder=2)
    ax.text(0.22, 0.33, "1. Why we use numerical methods and how errors happen in computers", fontsize=10, color=MUTED_TEXT, transform=ax.transAxes, va='top', zorder=2)
    ax.text(0.22, 0.27, "2. How the Bisection Method works visually with sign changes (+ve / -ve)", fontsize=10, color=MUTED_TEXT, transform=ax.transAxes, va='top', zorder=2)
    ax.text(0.22, 0.21, "3. Solving classic exam problems with our interactive Python Solver App", fontsize=10, color=MUTED_TEXT, transform=ax.transAxes, va='top', zorder=2)

    pdf.savefig(fig)
    plt.close()


# ==========================================
# SLIDE 2: WHY NUMERICAL?
# ==========================================
def slide_2_why_numerical(pdf):
    fig = plt.figure(figsize=(13.333, 7.5), dpi=300)
    ax = setup_slide(fig, 2, "Introduction: Why Do We Need Numerical Methods?", "From analytical algebra to computer approximation", 10)

    # Left Card: The Problem with Algebra
    draw_card(ax, 0.06, 0.12, 0.42, 0.70, bg_color="#FFFFFF", border_color="#CBD5E1")
    ax.text(0.09, 0.76, "The Problem with Normal Algebra", fontsize=12, fontweight='bold', color=HEADER_RED, transform=ax.transAxes, va='top')
    
    ax.text(0.09, 0.70, "• In high school, we solve equations with exact formulas:\n"
                        "     2x + 4 = 0   =>   x = -2\n"
                        "     x² - 5x + 6 = 0   =>   quadratic formula\n\n"
                        "• But in real engineering and science, equations look like:\n"
                        "     x³ - x - 11 = 0\n"
                        "     x - cos(x) = 0\n"
                        "     x · eˣ = 2\n\n"
                        "• There is NO simple formula to isolate 'x'!\n"
                        "  We call this a lack of an analytical solution.",
            fontsize=9.2, color=DARK_TEXT, transform=ax.transAxes, va='top', linespacing=1.35)

    # Right Card: The Numerical Solution
    draw_card(ax, 0.52, 0.12, 0.42, 0.70, bg_color="#FFFFFF", border_color="#93C5FD")
    ax.text(0.55, 0.76, "The Numerical Solution", fontsize=12, fontweight='bold', color=ACCENT_BLUE, transform=ax.transAxes, va='top')
    
    ax.text(0.55, 0.70, "• Instead of solving in one magic step, computers take\n"
                        "  repeated smart guesses (iterations).\n\n"
                        "• Each guess gets closer and closer to the true root until\n"
                        "  the error is small enough to accept.\n\n"
                        "• Why this matters today:\n"
                        "  ✔ Computers do thousands of guesses per second.\n"
                        "  ✔ It works on almost ANY continuous equation!\n"
                        "  ✔ Gives us practical answers for engineering problems.",
            fontsize=9.2, color=DARK_TEXT, transform=ax.transAxes, va='top', linespacing=1.35)

    # Bottom takeaway pill
    takeaway = draw_card(ax, 0.06, 0.12, 0.88, 0.09, bg_color="#EFF6FF", border_color="#BFDBFE")
    ax.text(0.09, 0.165, "Key Takeaway: Numerical methods give us practical, highly accurate solutions when exact math is impossible.",
            fontsize=9.5, fontweight='bold', color="#1E40AF", transform=ax.transAxes, va='center')

    pdf.savefig(fig)
    plt.close()


# ==========================================
# SLIDE 3: SOURCES OF ERRORS & REAL-WORLD IMPACT
# ==========================================
def slide_3_errors_sources(pdf):
    fig = plt.figure(figsize=(13.333, 7.5), dpi=300)
    ax = setup_slide(fig, 3, "Where Do Errors Come From?", "Why calculations are approximations and why tiny errors matter", 10)

    cards = [
        ("1. Model Errors",
         "Reality is too complex, so equations simplify things.\n\n"
         "• Example: Ignoring air resistance when calculating free fall.\n"
         "• We make assumptions to make the math solvable.",
         "#475569", "#FFFFFF"),

        ("2. Round-off Errors",
         "Computers store numbers in finite bits (32 or 64 bits).\n\n"
         "• A computer cannot store 1/3 = 0.33333333... forever.\n"
         "• Numbers like π and √2 get cut off, creating tiny round-off errors.",
         "#0284C7", "#FFFFFF"),

        ("3. Truncation Errors",
         "Cutting off an infinite mathematical series after a few terms.\n\n"
         "• Example: Taylor series approximation of eˣ.\n"
         "• Using 3 or 4 terms leaves a small residual error.",
         "#0D9488", "#FFFFFF"),
    ]

    for idx, (c_title, c_desc, c_col, c_bg) in enumerate(cards):
        cx = 0.06 + idx * 0.30
        draw_card(ax, cx, 0.38, 0.28, 0.44, bg_color=c_bg, border_color="#CBD5E1")
        ax.text(cx + 0.02, 0.77, c_title, fontsize=11, fontweight='bold', color=c_col, transform=ax.transAxes, va='top')
        ax.plot([cx + 0.02, cx + 0.26], [0.735, 0.735], color="#E2E8F0", linewidth=1.0, transform=ax.transAxes)
        ax.text(cx + 0.02, 0.70, c_desc, fontsize=8.2, color=DARK_TEXT, transform=ax.transAxes, va='top', linespacing=1.3)

    # Real World Story Callout: Patriot Missile
    story_box = draw_card(ax, 0.06, 0.12, 0.88, 0.22, bg_color="#FEF2F2", border_color="#FCA5A5")
    ax.text(0.09, 0.30, "Famous Real-World Lesson: The 1991 Patriot Missile Failure", fontsize=10.5, fontweight='bold', color=HEADER_RED, transform=ax.transAxes, va='top')
    ax.text(0.09, 0.25, "A radar system tracked time by adding 0.1 seconds repeatedly. Because 0.1 in binary cannot be stored exactly (round-off error),\n"
                        "the computer accumulated a tiny error of 0.000000095 seconds every tick. After 100 hours of continuous operation:\n"
                        "          Accumulated Error = 0.34 seconds  =>  Radar tracked target off by over 500 meters!\n"
                        "Result: Failed to intercept an incoming Scud missile. Lesson: In computing, understanding error is a matter of life and death.",
            fontsize=8.2, color="#7F1D1D", transform=ax.transAxes, va='top', linespacing=1.3)

    pdf.savefig(fig)
    plt.close()


# ==========================================
# SLIDE 4: THE 4 TYPES OF ERRORS
# ==========================================
def slide_4_four_errors(pdf):
    fig = plt.figure(figsize=(13.333, 7.5), dpi=300)
    ax = setup_slide(fig, 4, "The 4 Types of Numerical Errors", "Exact vs. Approximate, Absolute vs. Relative (Lecture Slide 8)", 10)

    # Simple Human Explanation Top Card
    draw_card(ax, 0.06, 0.65, 0.88, 0.17, bg_color="#F0FDF4", border_color="#86EFAC")
    ax.text(0.08, 0.78, "Think of it this way:", fontsize=10.5, fontweight='bold', color="#166534", transform=ax.transAxes, va='top')
    ax.text(0.08, 0.73, "• Exact Error: Compares your guess to the TRUE answer (only possible when someone tells you the true answer in advance!).\n"
                        "• Approximate Error: Compares your NEW guess to your OLD guess (always available during computer iterations!).\n"
                        "• Relative Error: Turns the error into a percentage (%) so you know how accurate it is regardless of scale.",
            fontsize=8.5, color="#14532D", transform=ax.transAxes, va='top', linespacing=1.3)

    # Clean Table directly mirroring Lecture Slide 8
    draw_card(ax, 0.06, 0.12, 0.88, 0.50, bg_color="#FFFFFF", border_color="#CBD5E1")
    ax.text(0.08, 0.58, "Summary Table (Standard Lecture Formula Reference)", fontsize=11, fontweight='bold', color=DARK_TEXT, transform=ax.transAxes, va='top')

    table_data = [
        ["Error Type", "Formula", "When Available", "Typical Use in App"],
        ["Exact Error (Et)", "| X_true - X_approx |", "Rare (needs true value)", "Theoretical benchmarking"],
        ["Approximate Error (Ea)", "| X_new - X_old |", "Always during iterations", "Measures step movement"],
        ["Relative Exact Error (et)", "(| X_true - X_approx | / | X_true |) × 100%", "Rare (needs true value)", "Reports final accuracy %"],
        ["Relative Approx. Error (ea)", "(| X_new - X_old | / | X_new |) × 100%", "Always during iterations", "OUR STOPPING CRITERION!"]
    ]

    t = ax.table(
        cellText=table_data[1:],
        colLabels=table_data[0],
        colWidths=[0.24, 0.32, 0.20, 0.24],
        loc='center',
        bbox=[0.08, 0.16, 0.84, 0.38]
    )
    t.auto_set_font_size(False)
    t.set_fontsize(8.0)
    t.set_zorder(10)

    # Style Header
    for col_idx in range(4):
        cell = t[(0, col_idx)]
        cell.set_facecolor(HEADER_RED)
        cell.get_text().set_color('white')
        cell.get_text().set_weight('bold')
        cell.set_zorder(10)

    # Style Rows (highlight stopping row in soft amber)
    for row_idx in range(1, len(table_data)):
        is_stopping = (row_idx == 4)
        for col_idx in range(4):
            cell = t[(row_idx, col_idx)]
            cell.set_edgecolor('#E2E8F0')
            if is_stopping:
                cell.set_facecolor('#FEF3C7')
                cell.get_text().set_weight('bold')
            else:
                cell.set_facecolor('#F8FAFC' if row_idx % 2 == 1 else '#FFFFFF')
            cell.set_zorder(10)

    pdf.savefig(fig)
    plt.close()


# ==========================================
# SLIDE 5: WHAT IS A ROOT & BOLZANO'S THEOREM
# ==========================================
def slide_5_root_and_bolzano(pdf):
    fig = plt.figure(figsize=(13.333, 7.5), dpi=300)
    ax = setup_slide(fig, 5, "What is a Root? (Bolzano's Sign Change Rule)", "Finding where the curve crosses zero (Lecture Slide 10)", 10)

    # Left: Explanation & Rule
    draw_card(ax, 0.06, 0.12, 0.42, 0.70, bg_color="#FFFFFF", border_color="#CBD5E1")
    ax.text(0.09, 0.76, "What is a Root?", fontsize=12, fontweight='bold', color=HEADER_RED, transform=ax.transAxes, va='top')
    ax.text(0.09, 0.70, "A root of f(x) is simply the point where:\n"
                        "                         f(x) = 0\n"
                        "On a graph, it is where the curve crosses the horizontal axis.",
            fontsize=9.2, color=DARK_TEXT, transform=ax.transAxes, va='top', linespacing=1.3)

    ax.text(0.09, 0.56, "Bolzano's Intermediate Value Theorem:", fontsize=11, fontweight='bold', color=DARK_TEXT, transform=ax.transAxes, va='top')
    ax.text(0.09, 0.51, "If a curve starts below the axis (negative) and ends above the axis (positive),\n"
                        "it CANNOT teleport across without crossing zero!\n\n"
                        "Mathematically:\n"
                        "If  f(a) < 0  and  f(b) > 0  (opposite signs),\n"
                        "Then there MUST be at least one root between a and b!\n\n"
                        "This gives us a 100% guarantee that a solution is trapped inside [a, b].",
            fontsize=8.5, color=DARK_TEXT, transform=ax.transAxes, va='top', linespacing=1.3)

    # Right: Embedded Curve Graph mirroring Lecture Slide 10
    draw_card(ax, 0.52, 0.12, 0.42, 0.70, bg_color="#FFFFFF", border_color="#CBD5E1")
    
    ax_plot = fig.add_axes([0.56, 0.20, 0.35, 0.54], zorder=10)
    xv = np.linspace(0.5, 3.0, 200)
    yv = xv**2 - 6*xv + 8  # Roots at 2 and 4. On [0, 3], root is at 2!
    
    # Let's plot on [1, 2.8] where it crosses 2.0
    x_sub = np.linspace(1.2, 2.7, 200)
    y_sub = x_sub**2 - 6*x_sub + 8

    ax_plot.plot(x_sub, y_sub, color="#0284C7", linewidth=2.5, label='f(x) curve')
    ax_plot.axhline(0, color="#64748B", linestyle='--', linewidth=1.2)

    # a and b points
    a_pt, b_pt = 1.5, 2.5
    fa_pt = a_pt**2 - 6*a_pt + 8   # +1.25 (+ve)
    fb_pt = b_pt**2 - 6*b_pt + 8   # -0.75 (-ve)
    
    ax_plot.plot(a_pt, fa_pt, 'o', color=GREEN_SIGN, markersize=8, label=f'f(a) = +ve ({fa_pt:.2f})')
    ax_plot.plot(b_pt, fb_pt, 'o', color=RED_SIGN, markersize=8, label=f'f(b) = -ve ({fb_pt:.2f})')
    ax_plot.plot(2.0, 0, '*', color=HEADER_RED, markersize=14, label='Root: f(x) = 0')

    ax_plot.vlines(a_pt, 0, fa_pt, color=GREEN_SIGN, linestyle=':')
    ax_plot.vlines(b_pt, 0, fb_pt, color=RED_SIGN, linestyle=':')

    ax_plot.set_title("Visual Proof: Opposite Signs Trap the Root", fontsize=9.5, fontweight='bold', color=DARK_TEXT, pad=8)
    ax_plot.set_xlabel("x", fontsize=8.5)
    ax_plot.set_ylabel("f(x)", fontsize=8.5)
    ax_plot.legend(loc='upper right', fontsize=7.5)
    ax_plot.grid(True, linestyle=':', alpha=0.5)

    pdf.savefig(fig)
    plt.close()


# ==========================================
# SLIDE 6: HOW THE BISECTION METHOD WORKS (THE 3 STEPS)
# ==========================================
def slide_6_how_it_works(pdf):
    fig = plt.figure(figsize=(13.333, 7.5), dpi=300)
    ax = setup_slide(fig, 6, "How the Bisection Method Works", "The simple 3-step loop: Cut, Check Sign, Discard Half", 10)

    # 3 Steps Horizontally
    steps = [
        ("Step 1: Find Midpoint",
         "Cut the interval in half!\n\n"
         "       x_mid = (a + b) / 2\n\n"
         "This midpoint is your current best approximation of the root.",
         ACCENT_BLUE),

        ("Step 2: Check Sign of f(x_mid)",
         "Plug the midpoint into the equation:\n\n"
         "• Is f(x_mid) == 0? You hit the exact root! Stop.\n"
         "• Is f(x_mid) positive (+ve) or negative (-ve)?",
         "#0D9488"),

        ("Step 3: Keep the Bracket",
         "Pick the half that has OPPOSITE signs!\n\n"
         "• If sign of f(x_mid) == sign of f(a):\n"
         "  The root is in the right half -> Replace a = x_mid.\n"
         "• Else replace b = x_mid. Throw away the rest!",
         HEADER_RED),
    ]

    for idx, (s_title, s_desc, s_col) in enumerate(steps):
        sx = 0.06 + idx * 0.30
        draw_card(ax, sx, 0.44, 0.28, 0.38, border_color=s_col)
        ax.text(sx + 0.02, 0.77, s_title, fontsize=11, fontweight='bold', color=s_col, transform=ax.transAxes, va='top')
        ax.plot([sx + 0.02, sx + 0.26], [0.735, 0.735], color="#E2E8F0", linewidth=1.0, transform=ax.transAxes)
        ax.text(sx + 0.02, 0.70, s_desc, fontsize=8.2, color=DARK_TEXT, transform=ax.transAxes, va='top', linespacing=1.3)

    # Stopping Criteria Bottom Card (Lecture Slide 9)
    draw_card(ax, 0.06, 0.12, 0.88, 0.27, bg_color="#FFFBEB", border_color="#FCD34D")
    ax.text(0.08, 0.34, "When Do We Stop? (Stopping Criteria — Lecture Slide 9)", fontsize=11, fontweight='bold', color="#92400E", transform=ax.transAxes, va='top')
    ax.text(0.08, 0.29, "In real exams and computer software, we stop iterating when:\n"
                        "1. Relative Error falls below tolerance:  ea = (|x_new - x_old| / |x_new|) × 100% ≤ Tolerance\n"
                        "2. Number of decimal places is reached: e.g., accurate to 3 decimal places (error < 0.0005)\n"
                        "3. Maximum iterations reached: protects against infinite loops.",
            fontsize=8.5, color="#78350F", transform=ax.transAxes, va='top', linespacing=1.3)

    pdf.savefig(fig)
    plt.close()


# ==========================================
# SLIDE 7: WORKED EXAMPLE (LECTURE EXAMPLE 1)
# ==========================================
def slide_7_lecture_example(pdf):
    fig = plt.figure(figsize=(13.333, 7.5), dpi=300)
    ax = setup_slide(fig, 7, "Worked Example: x² - 6x + 8 = 0", "Step-by-step walkthrough directly from Lecture Slide 11 & 12", 10)

    # Left: The Problem setup
    draw_card(ax, 0.06, 0.12, 0.38, 0.70, bg_color="#FFFFFF", border_color="#CBD5E1")
    ax.text(0.08, 0.76, "Problem Statement (Lecture Example 1):", fontsize=10.5, fontweight='bold', color=HEADER_RED, transform=ax.transAxes, va='top')
    ax.text(0.08, 0.71, "Solve  f(x) = x² - 6x + 8 = 0  in  [0, 3]", fontsize=10, fontweight='bold', fontfamily='monospace', color=DARK_TEXT, transform=ax.transAxes, va='top')

    ax.text(0.08, 0.64, "Initial Bracket Check:\n"
                        "• f(0) = 0² - 6(0) + 8 = +8  (+ve)\n"
                        "• f(3) = 3² - 6(3) + 8 = -1  (-ve)\n"
                        "Opposite signs! Root exists in [0, 3].\n\n"
                        "Iteration 1:\n"
                        "• Midpoint: x₁ = (0 + 3)/2 = 1.5\n"
                        "• f(1.5) = 1.5² - 6(1.5) + 8 = +1.25 (+ve)\n"
                        "• Since f(1.5) is +ve, replace a = 1.5. New interval: [1.5, 3].\n\n"
                        "Iteration 2:\n"
                        "• Midpoint: x₂ = (1.5 + 3)/2 = 2.25\n"
                        "• Error = |2.25 - 1.5| / 2.25 × 100% = 33.33%",
            fontsize=8.0, color=DARK_TEXT, transform=ax.transAxes, va='top', linespacing=1.28)

    # Right: Full Table directly reproducing Lecture Slide 12
    draw_card(ax, 0.46, 0.12, 0.48, 0.70, bg_color="#FFFFFF", border_color="#CBD5E1")
    ax.text(0.48, 0.76, "Lecture Iteration Table (Lecture Slide 12)", fontsize=11, fontweight='bold', color=DARK_TEXT, transform=ax.transAxes, va='top')

    table_data = [
        ["a (+ve)", "b (-ve)", "x_n = (a+b)/2", "Error %", "f(x_n)"],
        ["0", "3", "1.5", "---", "+ve"],
        ["1.5", "3", "2.25", "33%", "-ve"],
        ["1.5", "2.25", "1.875", "20%", "+ve"],
        ["1.875", "2.25", "2.0625", "9.091%", "-ve"],
        ["1.875", "2.0625", "1.96875", "4.76%", "+ve"],
        ["1.96875", "2.0625", "2.015625", "2.32%", "-ve"],
    ]

    t = ax.table(
        cellText=table_data[1:],
        colLabels=table_data[0],
        colWidths=[0.18, 0.18, 0.28, 0.20, 0.16],
        loc='center',
        bbox=[0.48, 0.16, 0.44, 0.54]
    )
    t.auto_set_font_size(False)
    t.set_fontsize(7.8)
    t.set_zorder(10)

    for col_idx in range(5):
        cell = t[(0, col_idx)]
        cell.set_facecolor(HEADER_RED)
        cell.get_text().set_color('white')
        cell.get_text().set_weight('bold')
        cell.set_zorder(10)

    for row_idx in range(1, len(table_data)):
        for col_idx in range(5):
            cell = t[(row_idx, col_idx)]
            cell.set_edgecolor('#E2E8F0')
            cell.set_facecolor('#F8FAFC' if row_idx % 2 == 1 else '#FFFFFF')
            cell.set_zorder(10)

    pdf.savefig(fig)
    plt.close()


# ==========================================
# SLIDE 8: THE PYTHON CLI SOLVER APP
# ==========================================
def slide_8_app_overview(pdf):
    fig = plt.figure(figsize=(13.333, 7.5), dpi=300)
    ax = setup_slide(fig, 8, "Our Python Solver App (bisection.py)", "How the app makes solving effortless, safe, and visual", 10)

    # 3 Features Cards
    app_cards = [
        ("1. Smart Expression Parser",
         "Type equations naturally without strict Python syntax!\n\n"
         "• Implicit Multiplication:\n"
         "  Type '2x' or '2sin(x)' — the app auto-converts to '2*x'.\n"
         "• Powers with Caret '^':\n"
         "  Type 'x^3 - 7x + 1' — converted safely to 'x**3'.\n"
         "• Safe AST Sandbox:\n"
         "  Blocks dangerous inputs; accepts all standard functions\n"
         "  (sin, cos, exp, log, sqrt, pi).",
         ACCENT_BLUE),

        ("2. Complete Terminal Table",
         "Prints every iteration clearly with ASCII borders:\n\n"
         "• 6 Informative Columns:\n"
         "  Iter | Lower (a) | Higher (b) | Midpoint (c) |\n"
         "  Approx Err (Ea) | Rel Approx (ea) %\n"
         "• No Hidden Rows:\n"
         "  Prints all iterations from 1 to N.\n"
         "• Clear Stop Marker:\n"
         "  Flags the converged row with '<-- [STOP]'.",
         "#0D9488"),

        ("3. 2-Panel Graphical Plot",
         "Visual verification saved directly to bisection_plot.png:\n\n"
         "• Left Panel: Root Localization\n"
         "  Shows the function curve, shaded bracket [a, b], and\n"
         "  marks the root with a star.\n"
         "• Right Panel: Error Decay Trajectory\n"
         "  Plots log error decay vs. iteration against the tolerance line.\n"
         "• Interactive GUI window opens automatically!",
         HEADER_RED)
    ]

    for idx, (c_title, c_desc, c_col) in enumerate(app_cards):
        cx = 0.06 + idx * 0.30
        draw_card(ax, cx, 0.14, 0.28, 0.68, border_color=c_col)
        ax.text(cx + 0.02, 0.76, c_title, fontsize=11, fontweight='bold', color=c_col, transform=ax.transAxes, va='top')
        ax.plot([cx + 0.02, cx + 0.26], [0.725, 0.725], color="#E2E8F0", linewidth=1.0, transform=ax.transAxes)
        ax.text(cx + 0.02, 0.69, c_desc, fontsize=8.0, color=DARK_TEXT, transform=ax.transAxes, va='top', linespacing=1.28)

    pdf.savefig(fig)
    plt.close()


# ==========================================
# SLIDE 9: SOLVING EXAM PROBLEMS (EXERCISE 3: x^3 - 7x + 1)
# ==========================================
def slide_9_exam_exercise(pdf):
    fig = plt.figure(figsize=(13.333, 7.5), dpi=300)
    ax = setup_slide(fig, 9, "Solving Exam Exercise 3: x³ - 7x + 1 = 0", "Finding the smaller positive root to 3 decimal places (Exercise Slide 16)", 10)

    # Left: Terminal Output Card
    draw_card(ax, 0.06, 0.12, 0.44, 0.70, bg_color="#FFFFFF", border_color="#CBD5E1")
    ax.text(0.08, 0.76, "Running it in the App:", fontsize=11, fontweight='bold', color=HEADER_RED, transform=ax.transAxes, va='top')
    ax.text(0.08, 0.71, "Input: f(x) = x^3 - 7x + 1,  Interval: [0, 1],  Tolerance: 0.001", fontsize=8.2, color=MUTED_TEXT, transform=ax.transAxes, va='top')

    summary_text = """+====================================================================================================+
|                              3. CONVERGENCE SUMMARY & ERROR ANALYSIS                               |
+====================================================================================================+
  Problem Specification:
    * Function f(x)       : x^3 - 7x + 1
    * Initial Range [a, b]: [0, 1]
    * Error Tolerance     : 0.001 (0.1%)
    * Stopping Criterion  : Relative Approximate Error (ea <= tolerance)

  Solution Results:
    * Approximate Root (c): 0.14318848
    * Function Value f(c) : +6.164488e-04  (effectively zero)
    * Iterations Required : 13
    * Termination Reason  : Reached relative tolerance or exact root

  Error Analysis (4 Numerical Errors):
    1. Relative Approx Error (ea) [Stopping Metric]: 8.5251e-04 (8.5251e-02%)
    2. Absolute Approx Error (Ea)                 : 1.220703e-04
    3. Absolute Exact Error  (Et = |x_true - c|)  : 8.884344e-05
    4. Relative Exact Error  (et = |x_true - c|/|x_t|): 6.2008e-04 (6.2008e-02%)
+====================================================================================================+"""

    term_box = patches.FancyBboxPatch((0.08, 0.16), 0.40, 0.50, boxstyle="round,pad=0.005", facecolor="#F8FAFC", edgecolor="#CBD5E1", transform=ax.transAxes, zorder=2)
    ax.add_patch(term_box)
    ax.text(0.09, 0.41, summary_text, fontfamily='monospace', fontsize=4.8, color=DARK_TEXT, transform=ax.transAxes, va='center', zorder=3)

    # Right: 2-Panel Plot Breakdown
    draw_card(ax, 0.52, 0.12, 0.42, 0.70, bg_color="#FFFFFF", border_color=ACCENT_BLUE)
    ax.text(0.54, 0.76, "Auto-Generated Plot (bisection_plot.png)", fontsize=11, fontweight='bold', color=ACCENT_BLUE, transform=ax.transAxes, va='top')

    # Curve subplot
    ax_p1 = fig.add_axes([0.56, 0.48, 0.35, 0.23], zorder=10)
    xv = np.linspace(-0.2, 1.2, 200)
    yv = xv**3 - 7*xv + 1
    ax_p1.plot(xv, yv, color=ACCENT_BLUE, linewidth=2, label='f(x) = x³ - 7x + 1')
    ax_p1.axhline(0, color='#94A3B8', linestyle='--', linewidth=0.8)
    ax_p1.plot(0.143, 0, '*', color=HEADER_RED, markersize=10, label='Root ≈ 0.143')
    ax_p1.axvspan(0, 1, alpha=0.15, color='#38BDF8', label='Bracket [0, 1]')
    ax_p1.set_title("Panel 1: Root Localization", fontsize=8.0, fontweight='bold', pad=4)
    ax_p1.legend(fontsize=6.5, loc='upper right')
    ax_p1.grid(True, linestyle=':', alpha=0.5)

    # Error decay subplot
    ax_p2 = fig.add_axes([0.56, 0.17, 0.35, 0.21], zorder=10)
    iters = np.arange(2, 14)
    ea_vals = 0.5**iters / 0.143
    ax_p2.semilogy(iters, ea_vals, 'o-', color=ACCENT_BLUE, markersize=4, label='Relative Error (ea)')
    ax_p2.axhline(0.001, color=HEADER_RED, linestyle='--', linewidth=1.2, label='Tolerance = 0.001')
    ax_p2.plot(13, ea_vals[-1], 's', color=HEADER_RED, markersize=7, label='Stop (Iter 13)')
    ax_p2.set_title("Panel 2: Error Decay Trajectory", fontsize=8.0, fontweight='bold', pad=4)
    ax_p2.set_xlabel("Iteration", fontsize=7.5)
    ax_p2.legend(fontsize=6.5, loc='upper right')
    ax_p2.grid(True, which='both', linestyle=':', alpha=0.5)

    pdf.savefig(fig)
    plt.close()


# ==========================================
# SLIDE 10: QUICK CHEAT SHEET & SUMMARY
# ==========================================
def slide_10_cheatsheet(pdf):
    fig = plt.figure(figsize=(13.333, 7.5), dpi=300)
    ax = setup_slide(fig, 10, "Summary & Exam Cheat Sheet", "Everything you need to know on one slide", 10)

    cards = [
        ("Golden Rules of Bisection",
         "1. Always check initial signs first: f(a)·f(b) < 0.\n"
         "2. Midpoint is always:  c = (a + b) / 2.\n"
         "3. Replace the endpoint that has the SAME sign as f(c).\n"
         "4. Calculate error using consecutive midpoints:\n"
         "        ea = |c_new - c_old| / |c_new| × 100%.\n"
         "5. '3 decimal places' means tolerance = 0.0005 (|c_new - c_old| < 0.0005).",
         HEADER_RED),

        ("Why Bisection is Loved",
         "• 100% Reliable: It NEVER fails or diverges if bracket is valid.\n"
         "• No Calculus: Doesn't need f'(x) (unlike Newton-Raphson).\n"
         "• Fast Shrinking: Halves interval width every step (shrinks by >1,000x in 10 steps!).\n"
         "• Perfect for starting other faster numerical methods.",
         ACCENT_BLUE),

        ("Using the Python App",
         "1. Open terminal:  python bisection.py\n"
         "2. Enter function: e.g.  x^3 - 7x + 1  or  2x + sin(x)\n"
         "3. Enter interval: e.g.  0, 1\n"
         "4. Enter tolerance: e.g. 0.001 (or hit Enter for default)\n"
         "5. View complete 102-char iteration table & 2-panel plot window!",
         "#059669")
    ]

    for idx, (c_title, c_desc, c_col) in enumerate(cards):
        cy = 0.64 - idx * 0.25
        draw_card(ax, 0.06, cy, 0.88, 0.22, border_color=c_col)
        ax.text(0.08, cy + 0.165, c_title, fontsize=11, fontweight='bold', color=c_col, transform=ax.transAxes, va='top')
        ax.plot([0.08, 0.92], [cy + 0.135, cy + 0.135], color="#E2E8F0", linewidth=1.0, transform=ax.transAxes)
        ax.text(0.08, cy + 0.11, c_desc, fontsize=8.2, color=DARK_TEXT, transform=ax.transAxes, va='top', linespacing=1.3)

    pdf.savefig(fig)
    plt.close()


def main():
    print(f"Generating human-friendly presentation: {PDF_FILENAME}...")
    with PdfPages(PDF_FILENAME) as pdf:
        slide_1_title(pdf)
        slide_2_why_numerical(pdf)
        slide_3_errors_sources(pdf)
        slide_4_four_errors(pdf)
        slide_5_root_and_bolzano(pdf)
        slide_6_how_it_works(pdf)
        slide_7_lecture_example(pdf)
        slide_8_app_overview(pdf)
        slide_9_exam_exercise(pdf)
        slide_10_cheatsheet(pdf)
    print(f"Successfully generated {PDF_FILENAME}!")


if __name__ == "__main__":
    main()
