"""
Base plugin interface and data models for numerical root-finding methods.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Callable, List, Optional, Tuple
import matplotlib.axes


@dataclass
class IterationRow:
    """Represents a single step in a numerical root-finding method."""
    iteration: int
    estimate: float           # Current best root approximation
    f_val: float              # f(estimate)
    ea: Optional[float]       # Absolute Approximate Error |x_curr - x_prev|
    rel_ea: Optional[float]   # Relative Approximate Error |x_curr - x_prev| / |x_curr|
    extra_cols: dict          # Method-specific column data for display


@dataclass
class MethodResult:
    """Encapsulates the full execution result of a numerical method."""
    method_name: str
    root: float
    iterations: int
    rows: List[IterationRow]
    initial_desc: str


class RootFindingMethod(ABC):
    """Abstract base class that all method plugins must implement."""

    @property
    @abstractmethod
    def key(self) -> str:
        """Unique short key for the method, e.g. 'bisection'."""
        pass

    @property
    @abstractmethod
    def name(self) -> str:
        """Human-readable display name, e.g. 'Bisection Method'."""
        pass

    @property
    @abstractmethod
    def description(self) -> str:
        """Brief summary of the algorithm, e.g. 'Interval Halving'."""
        pass

    @abstractmethod
    def read_inputs(self, f: Callable[[float], float]) -> Tuple:
        """Prompt user for method-specific initial inputs (e.g. interval, guesses).
        
        Returns:
            Tuple of validated initial parameters.
        """
        pass

    @abstractmethod
    def solve(
        self,
        f: Callable[[float], float],
        inputs: Tuple,
        tol: float,
        max_iter: int = 1000
    ) -> MethodResult:
        """Execute the method algorithm using Relative Approximate Error stopping rule."""
        pass

    @abstractmethod
    def get_table_header(self) -> str:
        """Return formatted header string for the iteration table."""
        pass

    @abstractmethod
    def format_row(self, row: IterationRow) -> str:
        """Return formatted string for an individual iteration row."""
        pass

    @abstractmethod
    def draw_method_plot(
        self,
        ax: matplotlib.axes.Axes,
        f: Callable[[float], float],
        result: MethodResult
    ) -> None:
        """Render method-specific visual constructions on the function plot panel.
        
        - Bisection: bracket shading, endpoints a/b, midpoint trajectory.
        - Secant: secant secant-chord lines connecting successive points (x_n-1, f(x_n-1)) and (x_n, f(x_n)).
        - Newton: tangent lines from (x_n, f(x_n)) down to zero crossings.
        """
        pass
