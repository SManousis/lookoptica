from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from app.deps.admin_auth import get_current_admin_user, get_db
from app.models.user import User
from app.schemas.erp_sync import ErpExportFile
from app.services.audit import log_admin_action
from app.services.erp_sync import apply_sync_plan, compute_sync_plan, summarize_plan

router = APIRouter(prefix="/admin", tags=["admin-erp-sync"])


@router.post("/erp-sync")
async def erp_sync(
    file: ErpExportFile,
    request: Request,
    dry_run: bool = Query(default=True),
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    """
    OptiAEye catalogue import. Dry-run by default: computes and returns the
    same plan a confirm would apply, without writing anything. Pass
    ?dry_run=false to actually create/update products.
    """
    plan = compute_sync_plan(db, file)
    summary = summarize_plan(plan)

    if dry_run:
        return {"dry_run": True, **summary}

    try:
        apply_sync_plan(db, plan)
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Import failed, no changes were saved: {exc}",
        ) from exc

    log_admin_action(
        db=db,
        admin=current_admin,
        action="erp_sync_import",
        resource_type="product_batch",
        metadata={**summary["counts"], "warnings_count": len(summary["warnings"])},
        request=request,
    )

    return {"dry_run": False, **summary}
