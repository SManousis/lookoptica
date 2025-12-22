import secrets
import os
import re
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.config import settings
from app.deps.admin_auth import get_current_admin_user
from app.models.user import User

router = APIRouter(
    prefix="/admin/uploads",
    tags=["admin-uploads"],
)

PUBLIC_IMAGE_PREFIX = "/uploads/images"


def safe_filename(filename: str) -> str:
    filename = os.path.basename(filename)
    filename = re.sub(r"[^a-zA-Z0-9._-]", "_", filename)
    return filename


def unique_path(path: Path) -> Path:
    if not path.exists():
        return path

    stem = path.stem
    suffix = path.suffix
    counter = 1

    while True:
        new_path = path.with_name(f"{stem}_{counter}{suffix}")
        if not new_path.exists():
            return new_path
        counter += 1


def get_product_image_dir() -> Path:
    destination = Path(settings.product_image_dir)
    destination.mkdir(parents=True, exist_ok=True)
    return destination


ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10 MB


@router.post("/product-image")
async def upload_product_image(
    file: UploadFile = File(...),
    _: User = Depends(get_current_admin_user),
):
    extension = Path(file.filename or "").suffix.lower()
    if extension not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Επιτρέπονται μόνο αρχεία {', '.join(sorted(ALLOWED_IMAGE_EXTENSIONS))}.",
        )

    original_name = file.filename or "image"
    safe_name = safe_filename(original_name)

    destination_dir = get_product_image_dir()
    destination = unique_path(destination_dir / safe_name)

    total_bytes = 0
    with destination.open("wb") as buffer:
        while True:
            chunk = await file.read(1024 * 1024)
            if not chunk:
                break
            total_bytes += len(chunk)
            if total_bytes > MAX_UPLOAD_SIZE:
                destination.unlink(missing_ok=True)
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail="Το αρχείο δεν μπορεί να ξεπερνά τα 10MB.",
                )
            buffer.write(chunk)

    public_path = f"{PUBLIC_IMAGE_PREFIX}/{destination.name}"
    return {
        "filename": destination.name,
        "path": public_path,
        "size": total_bytes,
        "message": "Το αρχείο ανέβηκε με επιτυχία.",
    }

