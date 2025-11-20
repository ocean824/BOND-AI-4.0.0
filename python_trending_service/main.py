from fastapi import FastAPI, HTTPException, Header, Depends
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
import os

from openai import OpenAI

INTERNAL_TOKEN = os.getenv("FASTAPI_INTERNAL_TOKEN")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Validate required configuration
if not INTERNAL_TOKEN:
    raise RuntimeError("FASTAPI_INTERNAL_TOKEN environment variable must be set for security")

if not OPENAI_API_KEY:
    raise RuntimeError("OPENAI_API_KEY environment variable must be set")

app = FastAPI(title="BondAI Trending Service")

# ---------- Models ----------

class FetchFilters(BaseModel):
    query: Optional[str] = None
    category: Optional[str] = None
    language: str = "en"

class FetchTrendingRequest(BaseModel):
    source: str = "news"
    limit: int = 20
    filters: FetchFilters = FetchFilters()

class TrendingTopic(BaseModel):
    external_id: Optional[str] = None
    title: str
    url: Optional[str] = None
    source: str = "news"
    category: Optional[str] = None
    score: Optional[float] = None
    published_at: Optional[str] = None
    metadata: Dict[str, object] = Field(default_factory=dict)

class FetchTrendingResponse(BaseModel):
    topics: List[TrendingTopic]

class SummarizeTopic(BaseModel):
    title: str
    url: Optional[str] = None
    content: Optional[str] = None  # if you later fetch article HTML here

class Summary(BaseModel):
    summary: str
    bullet_points: List[str] = Field(default_factory=list)
    risk_level: Optional[str] = None
    sentiment: Optional[str] = None
    relevance_score: Optional[float] = None
    model: Optional[str] = None

class SummarizeRequest(BaseModel):
    model: str = "gpt-4.1-mini"
    topics: List[SummarizeTopic]

class SummarizeResponse(BaseModel):
    summaries: List[Summary]

# ---------- Auth dependency ----------

def require_internal_token(x_internal_token: Optional[str] = Header(default=None)):
    if not x_internal_token or x_internal_token != INTERNAL_TOKEN:
        raise HTTPException(status_code=401, detail="Invalid or missing internal token")

# ---------- OpenAI client ----------

client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

# ---------- Endpoints ----------

@app.post(
    "/api/trending/fetch",
    response_model=FetchTrendingResponse,
    dependencies=[Depends(require_internal_token)],
)
async def fetch_trending(req: FetchTrendingRequest):
    """
    TODO: Replace this with real integration to a news/market API.
    For now, return a couple of synthetic but realistic bond-related topics.
    """

    topics = [
        TrendingTopic(
            external_id="demo-1",
            title="10-Year Treasury Yield Hits New High",
            url="https://example.com/treasury-yield",
            source=req.source,
            category=req.filters.category or "bonds",
            score=0.95,
            metadata={"demo": True},
        ),
        TrendingTopic(
            external_id="demo-2",
            title="Corporate Bond Spreads Widen Amid Risk-Off Sentiment",
            url="https://example.com/corp-bond-spreads",
            source=req.source,
            category=req.filters.category or "bonds",
            score=0.88,
            metadata={"demo": True},
        ),
    ][: req.limit]

    return FetchTrendingResponse(topics=topics)

@app.post(
    "/api/trending/summarize",
    response_model=SummarizeResponse,
    dependencies=[Depends(require_internal_token)],
)
async def summarize(req: SummarizeRequest):
    if client is None:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY not configured")

    summaries: List[Summary] = []

    for topic in req.topics:
        prompt = f"""You are a fixed-income and bond-market analyst. Analyze this news article and respond in JSON format:

Article title: {topic.title}
URL: {topic.url or "N/A"}

Provide a JSON response with this exact structure:
{{
  "summary": "3-4 sentence summary focused on bond-market impact",
  "bullet_points": ["takeaway 1", "takeaway 2", "takeaway 3"],
  "risk_level": "low|medium|high",
  "sentiment": "bullish|bearish|neutral"
}}"""

        try:
            completion = client.responses.create(
                model=req.model,
                input=prompt,
                max_output_tokens=512,
                response_format={"type": "json_object"}
            )

            # Parse AI response
            import json
            text = completion.output[0].content[0].text  # type: ignore
            parsed = json.loads(text)

            summaries.append(
                Summary(
                    summary=parsed.get("summary", "No summary available"),
                    bullet_points=parsed.get("bullet_points", []),
                    risk_level=parsed.get("risk_level"),
                    sentiment=parsed.get("sentiment"),
                    relevance_score=0.9,
                    model=req.model,
                )
            )
        except Exception as e:
            # Fallback if parsing fails
            summaries.append(
                Summary(
                    summary=f"Error generating summary: {str(e)}",
                    bullet_points=[],
                    risk_level="medium",
                    sentiment="neutral",
                    relevance_score=0.5,
                    model=req.model,
                )
            )

    return SummarizeResponse(summaries=summaries)
