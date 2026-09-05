# SEO Agent Integration — Windsurf Instructions

Apply all changes below to integrate a Claude-powered SEO agent into the existing
FastAPI 0.120.4 + Uvicorn + SQLAlchemy + PostgreSQL (psycopg) project.

---

## 1. Install Dependencies

Add to `requirements.txt` (or run `pip install`):

```
anthropic
apscheduler
beautifulsoup4
requests
pydantic-settings
psycopg[binary]
```

---

## 2. Create `.env` (if not present)

Create a `.env` file in the project root. Do NOT commit this to git.

```env
ANTHROPIC_API_KEY=sk-ant-your-key-here
DATABASE_URL=postgresql+psycopg://user:password@localhost/yourdb
SITE_URL=https://yoursite.com
SITEMAP_URL=https://yoursite.com/sitemap.xml
COMPETITOR_URL=https://competitor.com
```

Add `.env` to `.gitignore` if not already present.

---

## 3. Create `config.py`

Create `config.py` in the project root:

```python
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    anthropic_api_key: str
    database_url: str
    site_url: str = "https://yoursite.com"
    sitemap_url: str = "https://yoursite.com/sitemap.xml"
    competitor_url: str = ""

    class Config:
        env_file = ".env"


settings = Settings()
```

---

## 4. Create `database.py`

Create `database.py` in the project root (skip if it already exists — merge instead):

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from config import settings

engine = create_engine(settings.database_url)
SessionLocal = sessionmaker(bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

> If `database.py` already exists, import `settings` from `config` and ensure
> `Base`, `SessionLocal`, and `get_db` are exported. Do not duplicate the engine.

---

## 5. Create `seo_agent/` Package

Create the directory `seo_agent/` with the following files:

### `seo_agent/__init__.py`

```python
# SEO Agent package
```

---

### `seo_agent/models.py`

```python
from sqlalchemy import Column, Integer, Text, DateTime, func
from database import Base


class SEOAuditResult(Base):
    __tablename__ = "seo_audit_results"

    id = Column(Integer, primary_key=True, index=True)
    report = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    def to_dict(self):
        return {
            "id": self.id,
            "report": self.report,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
```

---

### `seo_agent/tools.py`

```python
import requests
from bs4 import BeautifulSoup

# ---------------------------------------------------------------------------
# Tool schemas — passed to Claude so it knows what tools are available
# ---------------------------------------------------------------------------

tools = [
    {
        "name": "analyze_page_content",
        "description": (
            "Fetch and analyze a page's content for SEO quality: "
            "readability, keyword usage, heading structure, word count, "
            "and existing meta tags."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "url": {"type": "string", "description": "The page URL to analyze"}
            },
            "required": ["url"],
        },
    },
    {
        "name": "generate_meta_tags",
        "description": (
            "Generate an optimized meta title (50-60 chars) and meta description "
            "(150-160 chars) for a page based on its content and target keyword."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "page_title": {"type": "string"},
                "page_content": {"type": "string"},
                "target_keyword": {
                    "type": "string",
                    "description": "Primary keyword to optimize for",
                },
            },
            "required": ["page_title", "page_content"],
        },
    },
    {
        "name": "check_sitemap",
        "description": (
            "Fetch and parse a sitemap XML. Returns the list of URLs present "
            "so missing or outdated pages can be identified."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "sitemap_url": {
                    "type": "string",
                    "description": "Full URL of the sitemap.xml",
                }
            },
            "required": ["sitemap_url"],
        },
    },
    {
        "name": "research_competitor",
        "description": (
            "Fetch a competitor's page and extract their title, meta description, "
            "headings, and content structure for keyword and strategy analysis."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "competitor_url": {
                    "type": "string",
                    "description": "The competitor page URL to research",
                }
            },
            "required": ["competitor_url"],
        },
    },
]


# ---------------------------------------------------------------------------
# Tool execution — called when Claude requests a tool
# ---------------------------------------------------------------------------

def execute_tool(tool_name: str, tool_input: dict) -> dict:
    handlers = {
        "analyze_page_content": lambda: _scrape_page(tool_input["url"]),
        "generate_meta_tags": lambda: tool_input,  # Claude generates the tags itself
        "check_sitemap": lambda: _parse_sitemap(tool_input["sitemap_url"]),
        "research_competitor": lambda: _scrape_page(tool_input["competitor_url"]),
    }
    handler = handlers.get(tool_name)
    if not handler:
        return {"error": f"Unknown tool: {tool_name}"}
    try:
        return handler()
    except Exception as e:
        return {"error": str(e)}


def _scrape_page(url: str) -> dict:
    headers = {"User-Agent": "Mozilla/5.0 (compatible; SEOAgent/1.0)"}
    resp = requests.get(url, headers=headers, timeout=15)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")

    meta_desc_tag = soup.find("meta", {"name": "description"})
    meta_desc = meta_desc_tag["content"] if meta_desc_tag else ""

    return {
        "url": url,
        "title": soup.title.string.strip() if soup.title else "",
        "meta_description": meta_desc,
        "headings": {
            "h1": [h.get_text(strip=True) for h in soup.find_all("h1")],
            "h2": [h.get_text(strip=True) for h in soup.find_all("h2")],
            "h3": [h.get_text(strip=True) for h in soup.find_all("h3")],
        },
        "word_count": len(soup.get_text().split()),
        "text_sample": soup.get_text(separator=" ", strip=True)[:3000],
    }


def _parse_sitemap(sitemap_url: str) -> dict:
    headers = {"User-Agent": "Mozilla/5.0 (compatible; SEOAgent/1.0)"}
    resp = requests.get(sitemap_url, headers=headers, timeout=15)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "xml")
    urls = [loc.get_text(strip=True) for loc in soup.find_all("loc")]
    return {
        "sitemap_url": sitemap_url,
        "total_urls": len(urls),
        "urls": urls,
    }
```

---

### `seo_agent/agent.py`

```python
import asyncio
import anthropic
from config import settings
from seo_agent.tools import tools, execute_tool

client = anthropic.Anthropic(api_key=settings.anthropic_api_key)


async def run_seo_agent(task_description: str, context: dict) -> str:
    """
    Run the SEO agent with a task description and context dict.
    Returns the final text report from Claude.

    Uses asyncio.to_thread for all blocking SDK calls so Uvicorn's
    event loop is never blocked.
    """
    messages = [
        {
            "role": "user",
            "content": f"{task_description}\n\nContext:\n{context}",
        }
    ]

    while True:
        response = await asyncio.to_thread(
            client.messages.create,
            model="claude-opus-4-8",
            max_tokens=4096,
            tools=tools,
            messages=messages,
        )

        # Claude finished — extract the text response
        if response.stop_reason == "end_turn":
            text_blocks = [b.text for b in response.content if hasattr(b, "text")]
            return "\n".join(text_blocks)

        # Claude wants to call a tool
        if response.stop_reason == "tool_use":
            messages.append({"role": "assistant", "content": response.content})
            tool_results = []

            for block in response.content:
                if block.type == "tool_use":
                    result = await asyncio.to_thread(
                        execute_tool, block.name, block.input
                    )
                    tool_results.append(
                        {
                            "type": "tool_result",
                            "tool_use_id": block.id,
                            "content": str(result),
                        }
                    )

            messages.append({"role": "user", "content": tool_results})

        # Safety: break on unexpected stop reason
        else:
            break

    return "Agent stopped unexpectedly."
```

---

### `seo_agent/scheduler.py`

```python
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from config import settings
from database import SessionLocal
from seo_agent.agent import run_seo_agent
from seo_agent.models import SEOAuditResult

scheduler = AsyncIOScheduler()

SEO_TASK_DESCRIPTION = """
Perform a comprehensive SEO audit with the following steps:

1. Analyze the homepage and identify SEO issues (meta tags, headings, content quality).
2. Check the sitemap for completeness — flag any important pages that may be missing.
3. Research the competitor URL provided and identify keyword gaps and content opportunities.
4. For each page analyzed, suggest an improved meta title and meta description.
5. Produce a prioritized action list ordered by SEO impact (high / medium / low).

Be specific and actionable. Include character counts for suggested meta tags.
"""


async def run_weekly_seo_audit() -> None:
    context = {
        "site_url": settings.site_url,
        "sitemap_url": settings.sitemap_url,
        "competitor_url": settings.competitor_url,
    }

    report = await run_seo_agent(
        task_description=SEO_TASK_DESCRIPTION,
        context=context,
    )

    db = SessionLocal()
    try:
        db.add(SEOAuditResult(report=report))
        db.commit()
    finally:
        db.close()


def start_scheduler() -> None:
    scheduler.add_job(
        run_weekly_seo_audit,
        CronTrigger(day_of_week="mon", hour=8, minute=0),  # Every Monday 08:00
        id="weekly_seo_audit",
        replace_existing=True,
    )
    scheduler.start()
```

---

## 6. Update `main.py`

Merge the following into the existing `main.py`. Do not remove existing routes.

```python
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session

from config import settings  # noqa: F401  (ensures .env is loaded early)
from database import engine, Base, get_db
from seo_agent.models import SEOAuditResult
from seo_agent.scheduler import start_scheduler, scheduler, run_weekly_seo_audit

# Register all SQLAlchemy models so tables are created
import seo_agent.models  # noqa: F401


# --------------------------------------------------------------------------
# Lifespan: start/stop the APScheduler alongside Uvicorn
# --------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create DB tables if they don't exist yet
    Base.metadata.create_all(bind=engine)
    # Start background scheduler
    start_scheduler()
    yield
    # Graceful shutdown
    scheduler.shutdown(wait=False)


# --------------------------------------------------------------------------
# App — pass lifespan here. If the app already has a lifespan context
# manager, merge the scheduler start/stop into it instead of replacing it.
# --------------------------------------------------------------------------

app = FastAPI(lifespan=lifespan)


# --------------------------------------------------------------------------
# SEO Agent routes
# --------------------------------------------------------------------------

@app.get("/seo/reports")
def get_seo_reports(limit: int = 10, db: Session = Depends(get_db)):
    """Return the most recent SEO audit reports."""
    results = (
        db.query(SEOAuditResult)
        .order_by(SEOAuditResult.created_at.desc())
        .limit(limit)
        .all()
    )
    return [r.to_dict() for r in results]


@app.get("/seo/reports/{report_id}")
def get_seo_report(report_id: int, db: Session = Depends(get_db)):
    """Return a single SEO audit report by ID."""
    result = db.query(SEOAuditResult).filter(SEOAuditResult.id == report_id).first()
    if not result:
        raise HTTPException(status_code=404, detail="Report not found")
    return result.to_dict()


@app.post("/seo/run-now")
async def trigger_seo_audit():
    """Manually trigger an SEO audit outside the weekly schedule."""
    await run_weekly_seo_audit()
    return {"status": "ok", "message": "SEO audit complete. Check /seo/reports for results."}
```

> **Note:** If `main.py` already instantiates `FastAPI()` without a `lifespan`
> argument, replace that line with the version above. If it already has a
> `lifespan`, add `start_scheduler()` / `scheduler.shutdown()` to the existing
> context manager rather than creating a second one.

---

## 7. Final File Tree

After applying all changes, the project should include:

```
.
├── .env                        ← new (do not commit)
├── config.py                   ← new
├── database.py                 ← new or updated
├── main.py                     ← updated
├── requirements.txt            ← updated
└── seo_agent/
    ├── __init__.py             ← new
    ├── agent.py                ← new
    ├── models.py               ← new
    ├── scheduler.py            ← new
    └── tools.py                ← new
```

---

## 8. Run

```bash
uvicorn main:app --reload
```

The scheduler starts automatically with the app.  
Test immediately with:

```bash
curl -X POST http://localhost:8000/seo/run-now
curl http://localhost:8000/seo/reports
```

---

## Notes for Windsurf

- Do **not** overwrite existing route handlers in `main.py` — append only.
- Do **not** replace an existing `lifespan` context manager — merge into it.
- If `database.py` already exports `Base`, `SessionLocal`, and `get_db`, skip
  recreating it and just import `settings` from `config` at the top.
- The `ANTHROPIC_API_KEY` in `.env` must be replaced with a real key from
  https://console.anthropic.com before the agent will run.