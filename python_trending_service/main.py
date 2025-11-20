from fastapi import FastAPI, HTTPException, Header, Depends
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
import os

from openai import OpenAI

INTERNAL_TOKEN = os.getenv("FASTAPI_INTERNAL_TOKEN")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

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
    if INTERNAL_TOKEN and x_internal_token != INTERNAL_TOKEN:
        raise HTTPException(status_code=401, detail="Invalid internal token")

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
        prompt = f"""You are a fixed-income and bond-market analyst.

Article title: {topic.title}
URL: {topic.url or "N/A"}

1. Write a concise 3–4 sentence summary focused on bond-market impact.
2. List 3–5 bullet-point takeaways.
3. Provide a risk level (low/medium/high).
4. Provide sentiment (bullish/bearish/neutral) for bond investors.
"""

        completion = client.responses.create(
            model=req.model,
            input=prompt,
            max_output_tokens=512,
        )

        # Adjust this to match the actual Response object structure
        text = completion.output[0].content[0].text  # type: ignore

        summaries.append(
            Summary(
                summary=text,
                bullet_points=[],
                risk_level=None,
                sentiment=None,
                relevance_score=0.9,
                model=req.model,
            )
        )

    return SummarizeResponse(summaries=summaries)
