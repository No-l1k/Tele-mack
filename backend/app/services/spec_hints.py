from datetime import datetime

from sqlalchemy.orm import Session

from ..models import SpecHint
from .specs_dictionary import INTERNAL_SPEC_KEYS, is_dictionary_spec_name, normalize_spec_name

HINT_MAX_LEN = 4000


def load_hints_map(db: Session, names: list[str] | tuple[str, ...] | set[str]) -> dict[str, str]:
    normalized = [normalize_spec_name(name) for name in names]
    normalized = [name for name in normalized if name]
    if not normalized:
        return {}
    rows = db.query(SpecHint).filter(SpecHint.name.in_(normalized)).all()
    return {row.name: row.hint for row in rows if (row.hint or "").strip()}


def load_all_hints(db: Session) -> dict[str, str]:
    rows = db.query(SpecHint).all()
    return {row.name: row.hint for row in rows if (row.hint or "").strip() and is_dictionary_spec_name(row.name)}


def upsert_spec_hints(db: Session, hints: dict | None) -> None:
    if not isinstance(hints, dict):
        return
    for raw_name, raw_hint in hints.items():
        name = normalize_spec_name(raw_name)
        if not name or name in INTERNAL_SPEC_KEYS:
            continue
        hint = str(raw_hint or "").strip()
        if len(hint) > HINT_MAX_LEN:
            hint = hint[:HINT_MAX_LEN]
        existing = db.query(SpecHint).filter(SpecHint.name == name).first()
        if not hint:
            if existing:
                db.delete(existing)
            continue
        if existing:
            existing.hint = hint
            existing.updated_at = datetime.utcnow()
        else:
            db.add(SpecHint(name=name, hint=hint))


def attach_hints_to_dictionary(dictionary: list[dict], hints: dict[str, str]) -> list[dict]:
    by_name = {item["name"]: item for item in dictionary}
    for item in dictionary:
        item["hint"] = hints.get(item["name"], "")
    for name, hint in hints.items():
        if name in by_name:
            continue
        dictionary.append(
            {
                "name": name,
                "usageCount": 0,
                "inCategory": False,
                "values": [],
                "hint": hint,
            }
        )
    return dictionary
