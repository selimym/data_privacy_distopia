"""Content loader for reference data and game content."""

import json
from pathlib import Path
from typing import Any

# Base data directory
DATA_DIR = Path(__file__).parent.parent.parent.parent / "data"


def load_json(relative_path: str) -> dict[str, Any]:
    """
    Load a JSON file from the data directory.

    Args:
        relative_path: Path relative to backend/data/ directory

    Returns:
        Parsed JSON content as dictionary

    Example:
        load_json("reference/health.json")
    """
    file_path = DATA_DIR / relative_path

    if not file_path.exists():
        raise FileNotFoundError(f"Data file not found: {file_path}")

    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)


def load_health_reference() -> dict:
    """Load health reference data."""
    return load_json("reference/health.json")


def load_judicial_reference() -> dict:
    """Load judicial reference data."""
    return load_json("reference/judicial.json")


def load_finance_reference() -> dict:
    """Load finance reference data."""
    return load_json("reference/finance.json")


def load_social_reference() -> dict:
    """Load social reference data."""
    return load_json("reference/social.json")


def load_outcome_templates() -> dict:
    """Load outcome templates from JSON."""
    return load_json("outcomes.json")


def load_directives() -> list:
    """Load directives from JSON."""
    data = load_json("directives.json")
    return data["directives"]


def load_risk_config() -> dict:
    """Load risk factor configuration."""
    return load_json("config/risk_factors.json")


def load_keywords() -> dict:
    """Load keyword configuration."""
    return load_json("config/keywords.json")


def load_correlation_alerts() -> dict:
    """Load correlation alert configuration."""
    return load_json("config/correlation_alerts.json")


def load_inference_rules() -> dict:
    """Load inference rules."""
    return load_json("inference_rules.json")
