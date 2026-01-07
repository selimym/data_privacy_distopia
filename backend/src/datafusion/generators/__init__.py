"""Data generators package for creating synthetic NPCs and records."""

from uuid import uuid4

from datafusion.generators.finance import generate_finance_record
from datafusion.generators.health import generate_health_record
from datafusion.generators.identity import generate_identity, generate_population
from datafusion.generators.judicial import generate_judicial_record
from datafusion.generators.location import generate_location_record
from datafusion.generators.social import generate_social_media_record


def generate_full_population(count: int, seed: int | None = None) -> dict:
    """
    Generate complete population with NPCs and all domain records.

    Returns dict with:
    - npcs: list of NPC dicts (matching NPCCreate schema)
    - health_records: dict mapping npc_id -> health record dict
    - finance_records: dict mapping npc_id -> finance record dict
    - judicial_records: dict mapping npc_id -> judicial record dict
    - location_records: dict mapping npc_id -> location record dict
    - social_media_records: dict mapping npc_id -> social media record dict
    """
    identities = generate_population(count, seed)

    npcs = []
    health_records = {}
    finance_records = {}
    judicial_records = {}
    location_records = {}
    social_media_records = {}

    for i, identity in enumerate(identities):
        npc_id = uuid4()

        npc_data = {**identity, "id": npc_id}
        npcs.append(npc_data)

        # Generate health records
        health_seed = seed + i + 1000 if seed is not None else None
        health_record = generate_health_record(npc_id, health_seed)
        health_records[str(npc_id)] = health_record

        # Generate finance records
        finance_seed = seed + i + 2000 if seed is not None else None
        finance_record = generate_finance_record(npc_id, finance_seed)
        finance_records[str(npc_id)] = finance_record

        # Generate judicial records
        judicial_seed = seed + i + 3000 if seed is not None else None
        judicial_record = generate_judicial_record(npc_id, judicial_seed)
        judicial_records[str(npc_id)] = judicial_record

        # Generate location records
        location_seed = seed + i + 4000 if seed is not None else None
        location_record = generate_location_record(npc_id, location_seed)
        location_records[str(npc_id)] = location_record

        # Generate social media records
        social_seed = seed + i + 5000 if seed is not None else None
        social_record = generate_social_media_record(npc_id, social_seed)
        social_media_records[str(npc_id)] = social_record

    return {
        "npcs": npcs,
        "health_records": health_records,
        "finance_records": finance_records,
        "judicial_records": judicial_records,
        "location_records": location_records,
        "social_media_records": social_media_records,
    }


__all__ = [
    "generate_identity",
    "generate_population",
    "generate_health_record",
    "generate_finance_record",
    "generate_judicial_record",
    "generate_location_record",
    "generate_social_media_record",
    "generate_full_population",
]
