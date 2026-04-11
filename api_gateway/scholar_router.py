from fastapi import APIRouter, Header, HTTPException
from typing import Dict, Any
from .scholar_agent import ScholarAgent

router = APIRouter()
scholar_agent = ScholarAgent()

@router.post("/api/v1/scholar/request")
async def scholar_request(
    request: Dict[str, Any],
    x_api_key: str | None = Header(default=None, alias="X-API-Key"),
) -> Dict[str, Any]:
    if not x_api_key:
        raise HTTPException(status_code=401, detail="missing X-API-Key")

    prompt = request.get("prompt")
    if not prompt:
        raise HTTPException(status_code=400, detail="missing prompt")

    intent_state = request.get("intent_state", {})
    response = await scholar_agent.handle_request(prompt, intent_state)

    return {
        "status": "success",
        "data": response
    }
