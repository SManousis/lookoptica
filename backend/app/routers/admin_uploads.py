import secrets
import shutil
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.deps.admin_auth import get_current_admin_user
from app.models.user import User

router = APIRouter(
  prefix="/admin/uploads",
  tags=["admin-uploads"],
)

PRODUCT_IMAGE_DIR = Path("/var/www/eshop_frontend/media/uploads/images")
PRODUCT_IMAGE_DIR.mkdir(parents=True, exist_ok=True)

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
      detail=f"Μόνο αρχεία {', '.join(sorted(ALLOWED_IMAGE_EXTENSIONS))} υποστηρίζονται.",
    )

  random_name = secrets.token_hex(16) + extension
  destination = PRODUCT_IMAGE_DIR / random_name

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
          detail="Το αρχείο εικόνας είναι μεγαλύτερο από 10MB.",
        )
      buffer.write(chunk)

  public_path = f"/uploads/images/{random_name}"
  return {
    "filename": random_name,
    "path": public_path,
    "size": total_bytes,
    "message": "Το αρχείο ανέβηκε επιτυχώς.",
  }
