"""
Automatic Domain Scanner and Root Bracket Isolator.
===================================================

Provides automated interval discovery for numerical root-finding algorithms
using Bolzano sign-change detection and adaptive grid scanning.
"""

import math
from typing import Callable, List, Optional, Tuple


def find_brackets(
    f: Callable[[float], float],
    x_min: float = -10.0,
    x_max: float = 10.0,
    steps: int = 200
) -> List[Tuple[float, float]]:
    """Scan interval [x_min, x_max] to locate brackets [a, b] where f(a)*f(b) <= 0.
    
    Handles domain errors (e.g. sqrt(-x), log(-x)) gracefully.
    
    Returns:
        List of (a, b) tuples representing isolated brackets containing at least one root.
    """
    if x_min >= x_max:
        x_min, x_max = x_max, x_min

    dx = (x_max - x_min) / float(steps)
    brackets: List[Tuple[float, float]] = []

    prev_x: Optional[float] = None
    prev_f: Optional[float] = None

    for i in range(steps + 1):
        x = x_min + i * dx
        try:
            val = f(x)
            if not isinstance(val, (int, float)) or not math.isfinite(val):
                prev_x, prev_f = None, None
                continue
        except Exception:
            prev_x, prev_f = None, None
            continue

        if prev_x is not None and prev_f is not None:
            # Check for exact root at boundary
            if abs(prev_f) < 1e-14:
                brackets.append((round(prev_x, 6), round(prev_x, 6)))
            # Bolzano sign change: f(x1) * f(x2) < 0
            elif prev_f * val < 0:
                brackets.append((round(prev_x, 6), round(x, 6)))

        prev_x, prev_f = x, val

    return brackets


def auto_detect_bracket(
    f: Callable[[float], float],
    preference: str = "smallest_positive"
) -> Optional[Tuple[float, float]]:
    """Automatically discover and recommend an optimal root bracket.
    
    Tries standard range [-10, 10], and widens to [-100, 100] if no brackets found.
    
    Parameters:
        f: Mathematical function callable.
        preference: 'smallest_positive' (default, selects smallest positive root),
                    'closest_to_zero', or 'first'.
                    
    Returns:
        (a, b) tuple or None if no sign change could be found.
    """
    # 1. Search default span [-10, 10]
    brackets = find_brackets(f, -10.0, 10.0, steps=200)

    # 2. If nothing found, try wider search span [-100, 100]
    if not brackets:
        brackets = find_brackets(f, -100.0, 100.0, steps=400)

    # 3. If still nothing found, try near-zero micro-scan for steep/narrow functions
    if not brackets:
        brackets = find_brackets(f, -2.0, 2.0, steps=200)

    if not brackets:
        return None

    if preference == "smallest_positive":
        # Filter brackets whose upper bound or midpoint is > 0
        positive_brackets = [b for b in brackets if (b[0] + b[1]) / 2.0 >= 0]
        if positive_brackets:
            # Sort by positive midpoint ascending
            return min(positive_brackets, key=lambda b: (b[0] + b[1]) / 2.0)

    elif preference == "closest_to_zero":
        return min(brackets, key=lambda b: abs((b[0] + b[1]) / 2.0))

    # Fallback to the first bracket discovered
    return brackets[0]
