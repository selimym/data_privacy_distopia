"""Standardized error response schemas."""

from pydantic import BaseModel, ConfigDict


class ErrorDetail(BaseModel):
    """Detailed error information."""

    field: str | None = None
    message: str


class ErrorResponse(BaseModel):
    """Standard error response format."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "error": "Not Found",
                "detail": "NPC not found",
                "status_code": 404,
            }
        }
    )

    error: str
    detail: str | list[ErrorDetail]
    status_code: int
