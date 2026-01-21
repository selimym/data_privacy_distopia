"""
System Mode session schemas.

Schemas for starting and initializing System Mode sessions.
"""

from uuid import UUID

from pydantic import BaseModel

from .dashboard import DirectiveRead


class SystemStartRequest(BaseModel):
    """Request to start System Mode session."""

    session_id: UUID


class SystemStartResponse(BaseModel):
    """Response after starting System Mode."""

    operator_id: UUID
    operator_code: str
    status: str
    compliance_score: float
    first_directive: DirectiveRead
