"""
Helper utilities for numerical formatting and derivative approximation.
"""

import math
from typing import Any, Callable, Dict, Optional


def sec(x: float) -> float:
    """Secant: sec(x) = 1 / cos(x)"""
    c = math.cos(x)
    if abs(c) < 1e-15:
        raise ZeroDivisionError("sec(x): division by zero (cos(x) = 0)")
    return 1.0 / c


def csc(x: float) -> float:
    """Cosecant: csc(x) = 1 / sin(x)"""
    s = math.sin(x)
    if abs(s) < 1e-15:
        raise ZeroDivisionError("csc(x): division by zero (sin(x) = 0)")
    return 1.0 / s


# cosec alias for csc
cosec = csc


def cot(x: float) -> float:
    """Cotangent: cot(x) = 1 / tan(x) = cos(x) / sin(x)"""
    s = math.sin(x)
    if abs(s) < 1e-15:
        raise ZeroDivisionError("cot(x): division by zero (sin(x) = 0)")
    return math.cos(x) / s


def sech(x: float) -> float:
    """Hyperbolic secant: sech(x) = 1 / cosh(x)"""
    ch = math.cosh(x)
    if abs(ch) < 1e-15:
        raise ZeroDivisionError("sech(x): division by zero")
    return 1.0 / ch


def csch(x: float) -> float:
    """Hyperbolic cosecant: csch(x) = 1 / sinh(x)"""
    sh = math.sinh(x)
    if abs(sh) < 1e-15:
        raise ZeroDivisionError("csch(x): division by zero (sinh(x) = 0)")
    return 1.0 / sh


def coth(x: float) -> float:
    """Hyperbolic cotangent: coth(x) = 1 / tanh(x)"""
    th = math.tanh(x)
    if abs(th) < 1e-15:
        raise ZeroDivisionError("coth(x): division by zero (tanh(x) = 0)")
    return 1.0 / th


def ln(x: float) -> float:
    """Natural logarithm: ln(x) = log(x)"""
    return math.log(x)


# Full safe math execution environment
SAFE_MATH: Dict[str, Any] = {
    k: getattr(math, k)
    for k in dir(math)
    if not k.startswith("_")
}
SAFE_MATH.update({
    "abs": abs,
    "sec": sec,
    "csc": csc,
    "cosec": cosec,
    "cot": cot,
    "sech": sech,
    "csch": csch,
    "coth": coth,
    "ln": ln,
    "log": math.log,
    "log10": math.log10,
    "log2": math.log2,
    "exp": math.exp,
    "tanh": math.tanh,
    "sinh": math.sinh,
    "cosh": math.cosh,
    "asinh": math.asinh,
    "acosh": math.acosh,
    "atanh": math.atanh,
    "e": math.e,
    "pi": math.pi,
})


def clean_num(val: float, threshold: float = 1e-11) -> float:
    """Eliminate floating negative zero (-0.0) and tiny numerical artifacts."""
    return 0.0 if abs(val) < threshold else val


def fmt_val(v: float, width: int = 14) -> str:
    """Format floating point numbers cleanly."""
    return f"{clean_num(v):>{width}.8f}"


def fmt_ea(v: Optional[float], width: int = 16) -> str:
    """Format Absolute Approximate Error."""
    if v is None:
        return "---".center(width)
    if v == 0.0:
        return "0.0".center(width)
    return f"{v:>{width}.8f}" if 0.001 <= v < 1000 else f"{v:>{width}.6e}"


def fmt_rel(v: Optional[float], width: int = 22) -> str:
    """Format Relative Approximate Error with percentage."""
    if v is None:
        return "---".center(width)
    if math.isinf(v):
        return "inf".center(width)
    if v == 0.0:
        return "0.0 (0.0%)".center(width)
    pct = v * 100
    return f"{v:>9.6f} ({pct:>6.2f}%)" if 0.001 <= v < 10 else f"{v:>9.3e} ({pct:>7.2e}%)"


def num_diff(f: Callable[[float], float], x: float, h: float = 1e-7) -> float:
    """Compute central difference derivative f'(x)."""
    return (f(x + h) - f(x - h)) / (2 * h)
