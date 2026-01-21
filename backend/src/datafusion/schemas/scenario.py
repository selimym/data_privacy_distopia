"""Pydantic schemas for scenario system."""

from pydantic import BaseModel, Field

from datafusion.schemas.abuse import AbuseActionRead
from datafusion.schemas.npc import NPCBasicRead


class ScenarioState(BaseModel):
    """Current state of a scenario session."""

    scenario_key: str = Field(description="Scenario identifier")
    phase: str = Field(
        description="Current phase (intro, exploration, escalation, consequences, conclusion)"
    )
    actions_taken: list[str] = Field(
        default_factory=list, description="Action keys executed in this session"
    )
    suggested_next: str | None = Field(default=None, description="Suggested next action key")
    npcs_discovered: list[str] = Field(default_factory=list, description="NPC IDs interacted with")


class ScenarioPrompt(BaseModel):
    """Narrative prompt to guide player through scenario."""

    prompt_text: str = Field(description="Narrative text for current moment")
    suggested_action: AbuseActionRead | None = Field(
        default=None, description="Suggested next action"
    )
    suggested_target: NPCBasicRead | None = Field(default=None, description="Suggested target NPC")
    phase: str = Field(description="Current scenario phase")
