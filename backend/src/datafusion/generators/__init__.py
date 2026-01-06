"""Data generators package for creating synthetic NPCs and records."""

from uuid import uuid4

from datafusion.generators.health import generate_health_record
from datafusion.generators.identity import generate_identity, generate_population


def generate_full_population(count: int, seed: int | None = None) -> dict:
    """
    Generate complete population with NPCs and their health records.

    Returns dict with:
    - npcs: list of NPC dicts (matching NPCCreate schema)
    - health_records: dict mapping npc_id -> health record dict
    """
    identities = generate_population(count, seed)

    npcs = []
    health_records = {}

    for i, identity in enumerate(identities):
        npc_id = uuid4()

        npc_data = {**identity, "id": npc_id}
        npcs.append(npc_data)

        health_seed = seed + i + 1000 if seed is not None else None
        health_record = generate_health_record(npc_id, health_seed)
        health_records[str(npc_id)] = health_record

    return {
        "npcs": npcs,
        "health_records": health_records,
    }


__all__ = [
    "generate_identity",
    "generate_population",
    "generate_health_record",
    "generate_full_population",
]
