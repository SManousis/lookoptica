def validate_gtin(value: str | int | None) -> str | None:
    """Return the digits of `value` if they form a valid GTIN-8/12/13/14
    (correct length, correct check digit), else None.

    Length + check-digit only - no restricted-circulation-number filtering.
    That extra rule exists for the storefront's structured-data SEO fix
    (frontend/src/utils/structuredData.js) and is out of scope here.
    """
    if value is None:
        return None
    s = str(value).strip()
    if not s.isdigit():
        return None
    if len(s) not in (8, 12, 13, 14):
        return None

    digits = [int(c) for c in s]
    check = digits[-1]
    body = digits[:-1]
    total = 0
    weight = 3
    for d in reversed(body):
        total += d * weight
        weight = 1 if weight == 3 else 3
    calc = (10 - (total % 10)) % 10
    return s if calc == check else None
