import re


def slugify(value: str) -> str:
    s = (value or "").lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")
