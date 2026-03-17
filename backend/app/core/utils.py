import re
import secrets
import string
from nanoid import generate


def generate_id(prefix: str = "") -> str:
    id_ = generate(size=21)
    return f"{prefix}_{id_}" if prefix else id_


def generate_token() -> str:
    return generate(size=32)


def generate_public_id() -> str:
    return generate(size=12)


def generate_slug(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower())
    return slug.strip("-")
