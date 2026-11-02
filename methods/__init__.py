"""
Methods plugin package: Registry and factory for root-finding and numerical algorithms.
"""

from typing import Dict, List, Optional
from .base import RootFindingMethod, IterationRow, MethodResult
from .bisection import BisectionMethod
from .secant import SecantMethod
from .newton import NewtonMethod
from .fixed_point import FixedPointMethod
from .jacobi import JacobiMethod
from .gauss_seidel import GaussSeidelMethod
from .scanner import find_brackets, auto_detect_bracket

# Canonical Registry of available numerical method plugins
METHOD_REGISTRY: Dict[str, RootFindingMethod] = {
    "1": BisectionMethod(),
    "2": SecantMethod(),
    "3": NewtonMethod(),
    "4": FixedPointMethod(),
    "5": JacobiMethod(),
    "6": GaussSeidelMethod(),
}

# Key aliases for user convenience
KEY_ALIASES: Dict[str, str] = {
    "b": "1",
    "bisection": "1",
    "s": "2",
    "secant": "2",
    "n": "3",
    "newton": "3",
    "newton-raphson": "3",
    "fp": "4",
    "fixed": "4",
    "fixed_point": "4",
    "fixed-point": "4",
    "j": "5",
    "jacobi": "5",
    "gs": "6",
    "gauss": "6",
    "gauss_seidel": "6",
    "gauss-seidel": "6",
}


def get_available_methods() -> List[RootFindingMethod]:
    """Return ordered list of available method plugins."""
    return list(METHOD_REGISTRY.values())


def get_method_by_choice(choice: str) -> Optional[RootFindingMethod]:
    """Retrieve a method plugin by number string ('1'..'6') or alias."""
    clean_choice = choice.strip().lower()
    if clean_choice in KEY_ALIASES:
        clean_choice = KEY_ALIASES[clean_choice]
    return METHOD_REGISTRY.get(clean_choice)
