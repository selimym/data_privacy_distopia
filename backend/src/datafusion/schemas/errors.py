"""Standardized error response schemas."""

from pydantic import BaseModel


class ErrorDetail(BaseModel):
    """Detailed error information."""

    field: str | None = None
    message: str


class ErrorResponse(BaseModel):
    """Standard error response format."""

    error: str
    detail: str | list[ErrorDetail]
    status_code: int

    class Config:
        json_schema_extra = {
            "example": {
                "error": "Not Found",
                "detail": "NPC not found",
                "status_code": 404
            }
        }
