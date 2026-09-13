"""
Generates the human-readable, prefixed IDs the frontend already expects
(e.g. "u-001", "ORD-58421", "PAY-90211", "SHP-77001", "c-01", "p-1001").

Each model exposes its own `id` as this string (it's the primary key -
see the README's "ID strategy" note for why this trades a little bit of
normalization for an API contract that matches src/types/*.ts exactly).
"""

import random
import string


def next_sequential_id(model, prefix: str, pad: int, start: int) -> str:
    """
    Looks at the highest existing numeric suffix for `prefix` on `model`
    and returns the next one, zero-padded to `pad` digits.
    """
    like_pattern = f"{prefix}%"
    existing = model.query.filter(model.id.like(like_pattern)).all()
    max_n = start - 1
    for row in existing:
        suffix = row.id[len(prefix):]
        if suffix.isdigit():
            max_n = max(max_n, int(suffix))
    return f"{prefix}{str(max_n + 1).zfill(pad)}"


def random_suffix(n: int = 6) -> str:
    return "".join(random.choices(string.digits, k=n))
