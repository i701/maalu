"""Write the API's OpenAPI schema to a file: `uv run python -m app.openapi ../web/openapi.json`.

The web app generates its types from that file (`just api-types`), and a test checks the committed
copy is current, so the API and the web types cannot drift apart unnoticed.
"""

import json
import sys
from pathlib import Path

from app.main import create_app


def schema_json() -> str:
    """The schema as stable, readable JSON (sorted keys, trailing newline)."""
    return json.dumps(create_app().openapi(), indent=2, sort_keys=True) + "\n"


if __name__ == "__main__":
    target = Path(sys.argv[1]) if len(sys.argv) > 1 else None
    if target is None:
        sys.stdout.write(schema_json())
    else:
        target.write_text(schema_json())
