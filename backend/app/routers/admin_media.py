import mimetypes
from pathlib import Path
from urllib.parse import unquote, urlparse

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.config import settings
from app.deps.admin_auth import get_current_admin_user, get_db
from app.models.product import Product as ProductModel
from app.models.user import User
from app.services.audit import log_admin_action

router = APIRouter(prefix="/admin/media", tags=["admin-media"])

ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"}


class DeleteMediaFilePayload(BaseModel):
    source: str = Field(min_length=1)
    path: str = Field(min_length=1, description="Relative file path within selected source")
    force: bool = False


def _normalize_public_path(path: str) -> str:
    raw = (path or "").replace("\\", "/").strip()
    if not raw:
        return ""
    if not raw.startswith("/"):
        raw = "/" + raw
    parts = [p for p in raw.split("/") if p and p not in {".", ".."}]
    return "/" + "/".join(parts)


def _normalize_relative_path(path: str) -> str:
    raw = (path or "").replace("\\", "/").strip().lstrip("/")
    parts = [p for p in raw.split("/") if p and p not in {".", ".."}]
    return "/".join(parts)


def _build_sources() -> dict[str, dict]:
    sources: dict[str, dict] = {}

    def _add(source_id: str, label: str, dir_value: str | None, public_prefix: str) -> None:
        if not dir_value:
            return
        directory = Path(dir_value).expanduser()
        resolved = str(directory.resolve(strict=False))
        if any(existing["dir_resolved"] == resolved for existing in sources.values()):
            return
        sources[source_id] = {
            "id": source_id,
            "label": label,
            "dir": directory,
            "dir_resolved": resolved,
            "public_prefix": _normalize_public_path(public_prefix).rstrip("/"),
        }

    _add("current", "Current uploads", settings.product_image_dir, "/uploads/images")
    _add("legacy", "Legacy images", settings.legacy_product_image_dir, "/product_images")
    return sources


def _resolve_target_file(source: dict, relative_path: str) -> tuple[Path, str]:
    normalized_rel = _normalize_relative_path(unquote(relative_path))
    if not normalized_rel:
        raise HTTPException(status_code=400, detail="Invalid file path")

    base_dir = Path(source["dir_resolved"])
    target = (base_dir / normalized_rel).resolve()
    try:
        target.relative_to(base_dir)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid file path") from exc

    return target, normalized_rel


def _iter_image_files(source: dict):
    base_dir = Path(source["dir_resolved"])
    if not base_dir.exists() or not base_dir.is_dir():
        return
    for path in base_dir.rglob("*"):
        if not path.is_file():
            continue
        if path.suffix.lower() not in ALLOWED_IMAGE_EXTENSIONS:
            continue
        yield path


def _extract_public_refs(raw_value: str, sources: dict[str, dict]) -> set[str]:
    refs: set[str] = set()
    parsed_path = urlparse(raw_value).path if isinstance(raw_value, str) else ""
    if not parsed_path:
        return refs

    normalized = _normalize_public_path(parsed_path)
    if not normalized:
        return refs

    for source in sources.values():
        prefix = source["public_prefix"]
        if not prefix:
            continue
        marker = prefix + "/"
        idx = normalized.find(marker)
        if idx >= 0:
            refs.add(_normalize_public_path(normalized[idx:]))
        elif normalized == prefix:
            refs.add(prefix)
    return refs


def _collect_linked_public_paths(db: Session, sources: dict[str, dict]) -> set[str]:
    linked: set[str] = set()
    rows = db.query(ProductModel).all()

    for row in rows:
        for image in row.images or []:
            if isinstance(image, str):
                linked.update(_extract_public_refs(image, sources))

        attrs = row.attributes or {}
        if not isinstance(attrs, dict):
            continue
        variants = attrs.get("variants", [])
        if not isinstance(variants, list):
            continue

        for variant in variants:
            if not isinstance(variant, dict):
                continue
            for key in ("image", "imageUrl"):
                value = variant.get(key)
                if isinstance(value, str):
                    linked.update(_extract_public_refs(value, sources))
            var_images = variant.get("images")
            if isinstance(var_images, list):
                for value in var_images:
                    if isinstance(value, str):
                        linked.update(_extract_public_refs(value, sources))

    return linked


@router.get("/sources")
def list_media_sources(
    current_admin: User = Depends(get_current_admin_user),
):
    _ = current_admin
    sources = _build_sources()
    return {
        "sources": [
            {
                "id": source["id"],
                "label": source["label"],
                "dir": source["dir_resolved"],
                "public_prefix": source["public_prefix"],
            }
            for source in sources.values()
        ]
    }


@router.get("/files")
def list_media_files(
    source: str = Query(default="all"),
    unlinked_only: bool = Query(default=False),
    q: str | None = Query(default=None),
    limit: int = Query(default=500, ge=1, le=5000),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    _ = current_admin
    sources = _build_sources()
    if source != "all" and source not in sources:
        raise HTTPException(status_code=404, detail="Unknown media source")

    selected_sources = sources.values() if source == "all" else [sources[source]]
    linked_public_paths = _collect_linked_public_paths(db, sources)
    query_text = (q or "").strip().lower()

    items: list[dict] = []
    for src in selected_sources:
        prefix = src["public_prefix"]
        for file_path in _iter_image_files(src):
            rel = file_path.relative_to(Path(src["dir_resolved"])).as_posix()
            public_path = _normalize_public_path(f"{prefix}/{rel}")
            is_linked = public_path in linked_public_paths

            if unlinked_only and is_linked:
                continue
            if query_text and query_text not in rel.lower() and query_text not in file_path.name.lower():
                continue

            stat = file_path.stat()
            items.append(
                {
                    "id": f"{src['id']}:{rel}",
                    "source": src["id"],
                    "source_label": src["label"],
                    "path": rel,
                    "filename": file_path.name,
                    "public_path": public_path,
                    "size_bytes": stat.st_size,
                    "updated_at": stat.st_mtime,
                    "is_linked": is_linked,
                }
            )

    items.sort(key=lambda x: x["updated_at"], reverse=True)
    total = len(items)
    paginated = items[offset : offset + limit]

    return {
        "total": total,
        "offset": offset,
        "limit": limit,
        "sources": [
            {
                "id": src["id"],
                "label": src["label"],
                "dir": src["dir_resolved"],
                "public_prefix": src["public_prefix"],
            }
            for src in sources.values()
        ],
        "items": paginated,
    }


@router.get("/preview")
def preview_media_file(
    source: str = Query(...),
    path: str = Query(...),
    current_admin: User = Depends(get_current_admin_user),
):
    _ = current_admin
    sources = _build_sources()
    src = sources.get(source)
    if not src:
        raise HTTPException(status_code=404, detail="Unknown media source")

    target, _ = _resolve_target_file(src, path)
    if not target.exists() or not target.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    if target.suffix.lower() not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Unsupported file type")

    media_type = mimetypes.guess_type(str(target))[0] or "application/octet-stream"
    return FileResponse(path=target, media_type=media_type, filename=target.name)


@router.delete("/files")
def delete_media_file(
    payload: DeleteMediaFilePayload,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    sources = _build_sources()
    src = sources.get(payload.source)
    if not src:
        raise HTTPException(status_code=404, detail="Unknown media source")

    target, normalized_rel = _resolve_target_file(src, payload.path)
    if not target.exists() or not target.is_file():
        raise HTTPException(status_code=404, detail="File not found")

    public_path = _normalize_public_path(f"{src['public_prefix']}/{normalized_rel}")
    linked_public_paths = _collect_linked_public_paths(db, sources)
    is_linked = public_path in linked_public_paths

    if is_linked and not payload.force:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="File is still linked to one or more products",
        )

    try:
        target.unlink()
    except OSError as exc:
        raise HTTPException(status_code=500, detail=f"Failed to delete file: {exc}") from exc

    log_admin_action(
        db=db,
        admin=current_admin,
        action="media_file_delete",
        resource_type="media_file",
        resource_id=None,
        metadata={
            "source": src["id"],
            "path": normalized_rel,
            "public_path": public_path,
            "was_linked": is_linked,
            "forced": payload.force,
        },
        request=request,
    )

    return {
        "ok": True,
        "source": src["id"],
        "path": normalized_rel,
        "public_path": public_path,
        "was_linked": is_linked,
    }
