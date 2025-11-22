from decimal import Decimal, InvalidOperation
from enum import Enum
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Body
from pydantic import BaseModel, Field, model_validator
from sqlalchemy.orm import Session

from app.deps.admin_auth import get_current_admin_user, get_db
from app.models.product import Product as ProductModel
from app.models.user import User
from app.services.audit import log_admin_action

router = APIRouter(
    prefix="/api/admin/contact-lenses",
    tags=["admin-contact-lenses"],
)


# ---------- Helpers ----------

def _decimal(value) -> Decimal:
    if value is None:
        return Decimal("0")
    try:
        return Decimal(str(value))
    except (InvalidOperation, ValueError, TypeError):
        return Decimal("0")


def decimal_range(start: Decimal, end: Decimal, step: Decimal) -> List[Decimal]:
    """
    Inclusive decimal range [start, end] with given step.
    """
    values: List[Decimal] = []
    current = start
    # guard against wrong order
    if start > end:
        return values
    while current <= end:
        values.append(current)
        current += step
    return values


class LensFamily(str, Enum):
    soft = "soft"
    rgp = "rgp"
    keratoconic = "keratoconic"
    scleral = "scleral"
    other = "other"


class LensDuration(str, Enum):
    daily = "daily"
    monthly = "monthly"
    days15 = "15days"
    months3 = "3months"
    yearly = "yearly"


class LensType(str, Enum):
    spherical = "spherical"
    astigmatic = "astigmatic"
    multifocal = "multifocal"


class AdditionScheme(str, Enum):
    HL = "HL"          # High / Low
    HML = "HML"        # High / Medium / Low
    DN_RANGE = "DN_RANGE"  # 1.00–2.75 step 0.25, each D / N

class ContactLensVariantUpdate(BaseModel):
    sphere: Optional[float] = None
    cylinder: Optional[float] = None
    axis: Optional[int] = None
    addition: Optional[float] = None
    addition_label: Optional[str] = None
    ean: Optional[str] = None

    availability: str = Field(
        default="preorder",
        pattern=r"^(in_stock|preorder|unavailable)$",
        description="Availability per variant",
    )
    quantity: int = Field(
        default=0,
        ge=0,
        description="Stock quantity for this specific variant",
    )


class ContactLensVariantsUpdatePayload(BaseModel):
    variants: List[ContactLensVariantUpdate]


class ContactLensVariantCreate(BaseModel):
    sphere: float
    cylinder: Optional[float] = None
    axis: Optional[int] = None
    addition: Optional[float] = None
    addition_label: Optional[str] = None
    ean: Optional[str] = None
    availability: str = Field(
        default="preorder",
        pattern=r"^(in_stock|preorder|unavailable)$",
        description="Availability per variant",
    )
    quantity: int = Field(
        default=0,
        ge=0,
        description="Stock quantity for this specific variant",
    )


class ContactLensVariantKey(BaseModel):
    sphere: Optional[float] = None
    cylinder: Optional[float] = None
    axis: Optional[int] = None
    addition: Optional[float] = None
    addition_label: Optional[str] = None

# ---------- Payload ----------

class ContactLensPayload(BaseModel):
    # base product identity
    title: str
    slug: str
    sku: str
    brand: Optional[str] = None
    ean: Optional[str] = None
    description: Optional[str] = None
    image: Optional[str] = None

    # classification
    family: LensFamily = Field(
        default=LensFamily.other,
        description="Lens family: RGP, keratoconic, scleral, other",
    )
    duration: LensDuration
    lens_type: LensType

    # optical geometry
    bc: Optional[float] = Field(default=None, description="Base curve")
    diameter: Optional[float] = Field(default=None, description="Diameter in mm")

    # pricing / status
    price: float

    # spherical range (used by all types)
    sph_min: Optional[float] = Field(
        default=None,
        description="Minimum sphere value (inclusive) e.g. -10.00",
    )
    sph_max: Optional[float] = Field(
        default=None,
        description="Maximum sphere value (inclusive) e.g. +6.00",
    )

    # astigmatic (toric) extra ranges
    cyl_min: Optional[float] = Field(
        default=None,
        description="Minimum cylinder (negative, e.g. -0.75)",
    )
    cyl_max: Optional[float] = Field(
        default=None,
        description="Maximum cylinder (negative, e.g. -2.25)",
    )

    # multifocal addition scheme
    addition_scheme: Optional[AdditionScheme] = Field(
        default=None,
        description="HL / HML / DN_RANGE for multifocal",
    )

    @model_validator(mode="after")
    def validate_by_type(self) -> "ContactLensPayload":
        # All types need sphere min/max
        if self.sph_min is None or self.sph_max is None:
            raise ValueError("sph_min and sph_max are required for all lens types")
        if self.sph_min > self.sph_max:
            raise ValueError("sph_min cannot be greater than sph_max")

        # Spherical: only sphere range
        if self.lens_type == LensType.spherical:
            if self.cyl_min is not None or self.cyl_max is not None:
                raise ValueError("cyl_min/cyl_max must be empty for spherical lenses")
            if self.addition_scheme is not None:
                raise ValueError("addition_scheme must be empty for spherical lenses")

        # Astigmatic: needs cyl range
        if self.lens_type == LensType.astigmatic:
            if self.cyl_min is None or self.cyl_max is None:
                raise ValueError("cyl_min and cyl_max are required for astigmatic lenses")
            if self.cyl_min > self.cyl_max:
                raise ValueError("cyl_min cannot be greater than cyl_max")
            if self.addition_scheme is not None:
                raise ValueError("addition_scheme must be empty for astigmatic lenses")

        # Multifocal: needs addition scheme, no cyl
        if self.lens_type == LensType.multifocal:
            if self.addition_scheme is None:
                raise ValueError("addition_scheme is required for multifocal lenses")
            if self.cyl_min is not None or self.cyl_max is not None:
                raise ValueError("cyl_min/cyl_max must be empty for multifocal lenses")

        return self


class ContactLensUpdatePayload(ContactLensPayload):
    regenerate_variants: bool = Field(
        default=False,
        description="If true, regenerate all variants from the provided ranges (overwrites stock/EAN data).",
    )


# ---------- Variant generation ----------

def generate_spherical_variants(payload: ContactLensPayload) -> List[Dict[str, Any]]:
    sph_values = decimal_range(
        Decimal(str(payload.sph_min)),
        Decimal(str(payload.sph_max)),
        Decimal("0.25"),
    )
    variants = []
    for sph in sph_values:
        variants.append(
            {
                "sphere": float(sph),
                "cylinder": None,
                "axis": None,
                "addition": None,
                "addition_label": None,
                "ean": None,
                "availability": "preorder",
                "quantity": 0,
            }
        )
    return variants


def generate_astigmatic_variants(payload: ContactLensPayload) -> List[Dict[str, Any]]:
    sph_values = decimal_range(
        Decimal(str(payload.sph_min)),
        Decimal(str(payload.sph_max)),
        Decimal("0.25"),
    )
    cyl_values = decimal_range(
        Decimal(str(payload.cyl_min)),
        Decimal(str(payload.cyl_max)),
        Decimal("0.50"),
    )
    axes = list(range(0, 181, 10))

    variants = []
    for sph in sph_values:
        for cyl in cyl_values:
            c = cyl
            # ensure cylinder is negative
            if c > 0:
                c = -c
            for axis in axes:
                variants.append(
                    {
                        "sphere": float(sph),
                        "cylinder": float(c),
                        "axis": axis,
                        "addition": None,
                        "addition_label": None,
                        "ean": None,
                        "availability": "preorder",
                        "quantity": 0,
                    }
                )
    return variants


def get_multifocal_additions(scheme: AdditionScheme) -> List[Dict[str, Any]]:
    """
    Returns list of additions with value + label.
    For HL/HML we only use labels, no numeric addition.
    For DN_RANGE we use numeric addition and D/N labels.
    """
    if scheme == AdditionScheme.HL:
        return [
            {"addition": None, "label": "LOW"},
            {"addition": None, "label": "HIGH"},
        ]
    if scheme == AdditionScheme.HML:
        return [
            {"addition": None, "label": "LOW"},
            {"addition": None, "label": "MEDIUM"},
            {"addition": None, "label": "HIGH"},
        ]
    if scheme == AdditionScheme.DN_RANGE:
        adds = []
        values = decimal_range(Decimal("1.00"), Decimal("2.75"), Decimal("0.25"))
        for add in values:
            adds.append({"addition": float(add), "label": f"{add:.2f}D"})
            adds.append({"addition": float(add), "label": f"{add:.2f}N"})
        return adds
    return []


def generate_multifocal_variants(payload: ContactLensPayload) -> List[Dict[str, Any]]:
    sph_values = decimal_range(
        Decimal(str(payload.sph_min)),
        Decimal(str(payload.sph_max)),
        Decimal("0.25"),
    )
    additions = get_multifocal_additions(payload.addition_scheme)
    variants: List[Dict[str, Any]] = []

    for sph in sph_values:
        for add in additions:
            variants.append(
                    {
                        "sphere": float(sph),
                        "cylinder": None,
                        "axis": None,
                        "addition": add["addition"],
                        "addition_label": add["label"],
                        "ean": None,
                        "availability": "preorder",
                        "quantity": 0,
                    }
                )
    return variants


def serialize_contact_lens(product: ProductModel) -> dict:
    attrs = product.attributes or {}
    variants: List[Dict[str, Any]] = attrs.get("variants", [])

    # derive summary arrays for frontend table
    sphere_vals = sorted(
        {v["sphere"] for v in variants if v.get("sphere") is not None}
    )
    cyl_vals = sorted(
        {v["cylinder"] for v in variants if v.get("cylinder") is not None}
    )
    axis_vals = sorted(
        {v["axis"] for v in variants if v.get("axis") is not None}
    )

    return {
        "id": product.id,
        "sku": product.sku,
        "ean": product.ean,
        "slug": product.slug,
        "title": {"el": product.title_el, "en": product.title_en},
        "brand": attrs.get("brand_label"),
        "family": attrs.get("lens_family"),
        "duration": attrs.get("duration"),
        "lens_type": attrs.get("lens_type"),
        "bc": attrs.get("bc"),
        "diameter": attrs.get("diameter"),
        "price": float(product.price) if product.price is not None else None,
        "status": product.status,
        "availability": attrs.get("availability", product.status),
        "sphere": sphere_vals,
        "cylinder": cyl_vals,
        "axis": axis_vals,
        "description": product.description,
        "image": (product.images or [None])[0],
        "attributes": attrs,
        "variants_count": len(variants),
    }


# ---------- Routes ----------

@router.post("", status_code=201)
def create_contact_lens(
    payload: ContactLensPayload,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    """
    Create or update a contact lens base product and auto-generate variants
    based on lens_type and ranges (spherical, astigmatic, multifocal).
    """
    product = db.query(ProductModel).filter(ProductModel.sku == payload.sku).first()
    created = False

    if not product:
        created = True
        product = ProductModel(
            sku=payload.sku,
            slug=payload.slug,
            title_el=payload.title,
            title_en=payload.title,
            visible=True,
        )

    # Base product fields
    product.slug = payload.slug or product.slug
    product.title_el = payload.title or product.title_el
    product.title_en = payload.title or product.title_en
    if payload.ean is not None:
        product.ean = payload.ean
    product.price = _decimal(payload.price)
    product.compare_at_price = None
    product.description = payload.description

    # Attributes
    attrs: Dict[str, Any] = dict(product.attributes or {})
    attrs["product_type"] = "contact_lens"
    attrs["brand_label"] = payload.brand
    attrs["lens_family"] = payload.family.value
    attrs["duration"] = payload.duration.value
    attrs["lens_type"] = payload.lens_type.value
    attrs["bc"] = payload.bc
    attrs["diameter"] = payload.diameter

    # Store ranges in attributes for reference
    attrs["sph_min"] = payload.sph_min
    attrs["sph_max"] = payload.sph_max
    attrs["cyl_min"] = payload.cyl_min
    attrs["cyl_max"] = payload.cyl_max
    attrs["addition_scheme"] = payload.addition_scheme.value if payload.addition_scheme else None

    # Generate variants depending on lens_type
    if payload.lens_type == LensType.spherical:
        variants = generate_spherical_variants(payload)
    elif payload.lens_type == LensType.astigmatic:
        variants = generate_astigmatic_variants(payload)
    else:  # multifocal
        variants = generate_multifocal_variants(payload)

    attrs["variants"] = variants

    if variants:
        attrs["availability"] = "preorder"
        product.status = "preorder"
        product.visible = True
    else:
        attrs["availability"] = "unavailable"
        product.status = "unavailable"
        product.visible = False

    product.attributes = attrs
    product.images = [payload.image] if payload.image else []
    product.stock = product.stock or 0
    product.version = (product.version or 0) + 1

    db.add(product)
    db.commit()
    db.refresh(product)

    action = "contact_lens_create" if created else "contact_lens_update"
    log_admin_action(
        db=db,
        admin=current_admin,
        action=action,
        resource_type="product",
        resource_id=product.id,
        metadata={
            "sku": product.sku,
            "slug": product.slug,
            "status": product.status,
            "lens_type": payload.lens_type.value,
            "variants_count": len(variants),
            "created": created,
        },
        request=request,
    )

    return {"created": created, "product": serialize_contact_lens(product)}


@router.get("")
def list_contact_lenses(
    available_only: bool = Query(default=False, description="If true, only return lenses marked in_stock"),
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    """
    List contact lens base products, including summary of generated variants.
    """
    query = db.query(ProductModel).filter(
        ProductModel.attributes["product_type"].astext == "contact_lens"
    )
    if available_only:
        query = query.filter(ProductModel.attributes["availability"].astext == "in_stock")

    products = query.order_by(ProductModel.updated_at.desc()).all()
    return [serialize_contact_lens(p) for p in products]


@router.get("/{sku}")
def get_contact_lens(
    sku: str,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    """
    Return the base contact lens product with attributes (without expanding all variants).
    """
    product = (
        db.query(ProductModel)
        .filter(ProductModel.sku == sku)
        .filter(ProductModel.attributes["product_type"].astext == "contact_lens")
        .first()
    )
    if not product:
        product = db.query(ProductModel).filter(ProductModel.sku == sku).first()
    if not product:
        raise HTTPException(status_code=404, detail="Contact lens not found")
    return serialize_contact_lens(product)


@router.put("/{sku}")
def update_contact_lens(
    sku: str,
    payload: ContactLensUpdatePayload,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    """
    Update base contact lens information. Optionally regenerate all variants from the provided ranges.
    """
    product = (
        db.query(ProductModel)
        .filter(ProductModel.sku == sku)
        .filter(ProductModel.attributes["product_type"].astext == "contact_lens")
        .first()
    )
    if not product:
        product = db.query(ProductModel).filter(ProductModel.sku == sku).first()
    if not product:
        raise HTTPException(status_code=404, detail="Contact lens not found")

    if payload.sku != sku:
        raise HTTPException(
            status_code=400, detail="Payload SKU does not match contact lens."
        )

    product.slug = payload.slug or product.slug
    product.title_el = payload.title or product.title_el
    product.title_en = payload.title or product.title_en
    product.ean = payload.ean
    product.price = _decimal(payload.price)
    product.compare_at_price = None
    product.description = payload.description

    attrs: Dict[str, Any] = dict(product.attributes or {})
    if attrs.get("product_type") != "contact_lens":
        attrs["product_type"] = "contact_lens"

    existing_lens_type = attrs.get("lens_type")
    if (
        existing_lens_type
        and existing_lens_type != payload.lens_type.value
        and not payload.regenerate_variants
    ):
        raise HTTPException(
            status_code=400,
            detail="Changing lens type requires variant regeneration.",
        )

    attrs["product_type"] = "contact_lens"
    attrs["brand_label"] = payload.brand
    attrs["lens_family"] = payload.family.value
    attrs["duration"] = payload.duration.value
    attrs["lens_type"] = payload.lens_type.value
    attrs["bc"] = payload.bc
    attrs["diameter"] = payload.diameter
    attrs["sph_min"] = payload.sph_min
    attrs["sph_max"] = payload.sph_max
    attrs["cyl_min"] = payload.cyl_min
    attrs["cyl_max"] = payload.cyl_max
    attrs["addition_scheme"] = (
        payload.addition_scheme.value if payload.addition_scheme else None
    )

    regenerated = False
    if payload.regenerate_variants:
        regenerated = True
        if payload.lens_type == LensType.spherical:
            variants = generate_spherical_variants(payload)
        elif payload.lens_type == LensType.astigmatic:
            variants = generate_astigmatic_variants(payload)
        else:
            variants = generate_multifocal_variants(payload)
        attrs["variants"] = variants

        if variants:
            attrs["availability"] = "preorder"
            product.status = "preorder"
            product.visible = True
        else:
            attrs["availability"] = "unavailable"
            product.status = "unavailable"
            product.visible = False
    else:
        variants = attrs.get("variants", [])
        attrs["variants"] = variants

    product.attributes = attrs
    product.images = [payload.image] if payload.image else []
    product.version = (product.version or 0) + 1

    db.add(product)
    db.commit()
    db.refresh(product)

    log_admin_action(
        db=db,
        admin=current_admin,
        action="contact_lens_update",
        resource_type="product",
        resource_id=product.id,
        metadata={
            "sku": product.sku,
            "regenerated": regenerated,
            "variants_total": len(attrs.get("variants", [])),
        },
        request=request,
    )

    return {
        "ok": True,
        "product": serialize_contact_lens(product),
        "regenerated": regenerated,
    }


def _variant_signature(obj: Dict[str, Any]) -> tuple:
    """Create a normalized signature (sphere, cyl, axis, add, add_label) for comparison."""

    def _num(val):
        try:
            return f"{float(val):.2f}"
        except Exception:
            return None

    def _axis(val):
        try:
            return int(val)
        except Exception:
            return None

    label = obj.get("addition_label") if isinstance(obj, dict) else getattr(obj, "addition_label", None)
    label = label.strip() if isinstance(label, str) else label
    return (
        _num(obj.get("sphere") if isinstance(obj, dict) else getattr(obj, "sphere", None)),
        _num(obj.get("cylinder") if isinstance(obj, dict) else getattr(obj, "cylinder", None)),
        _axis(obj.get("axis") if isinstance(obj, dict) else getattr(obj, "axis", None)),
        _num(obj.get("addition") if isinstance(obj, dict) else getattr(obj, "addition", None)),
        label or None,
    )


def _variant_match(v: Dict[str, Any], u: ContactLensVariantUpdate) -> bool:
    """Match a stored variant dict with an update payload by optical parameters."""
    return _variant_signature(v) == _variant_signature(u.model_dump())


def _variant_match_key(v: Dict[str, Any], k: ContactLensVariantKey) -> bool:
    """Match a stored variant with a lightweight identifier payload."""
    return _variant_signature(v) == _variant_signature(k.model_dump())
@router.get("/{sku}/variants")
def get_contact_lens_variants(
    sku: str,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    """
    Return all variants for a given contact lens SKU,
    including sphere/cylinder/axis/addition and stock/availability.
    """
    product = (
        db.query(ProductModel)
        .filter(ProductModel.sku == sku)
        .filter(ProductModel.attributes["product_type"].astext == "contact_lens")
        .first()
    )
    if not product:
        # Fallback for legacy records that were created without product_type
        product = db.query(ProductModel).filter(ProductModel.sku == sku).first()

    if not product:
        raise HTTPException(status_code=404, detail="Contact lens not found")

    attrs: Dict[str, Any] = product.attributes or {}
    variants: List[Dict[str, Any]] = attrs.get("variants", [])

    # Sort variants in a sensible order: sph, cyl, axis, addition_label
    def sort_key(v: Dict[str, Any]):
        return (
            v.get("sphere") if v.get("sphere") is not None else 0.0,
            v.get("cylinder") if v.get("cylinder") is not None else 0.0,
            v.get("axis") if v.get("axis") is not None else -1,
            (v.get("addition_label") or ""),
        )

    variants_sorted = sorted(variants, key=sort_key)

    return {
        "sku": product.sku,
        "ean": product.ean,
        "slug": product.slug,
        "title": {"el": product.title_el, "en": product.title_en},
        "brand": attrs.get("brand_label"),
        "family": attrs.get("lens_family"),
        "duration": attrs.get("duration"),
        "lens_type": attrs.get("lens_type"),
        "bc": attrs.get("bc"),
        "diameter": attrs.get("diameter"),
        "variants": variants_sorted,
    }


@router.post("/{sku}/variants", status_code=201)
def create_contact_lens_variant(
    sku: str,
    payload: ContactLensVariantCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    """
    Append a single variant to a contact lens, validating required optical fields
    based on the lens type.
    """
    product = (
        db.query(ProductModel)
        .filter(ProductModel.sku == sku)
        .filter(ProductModel.attributes["product_type"].astext == "contact_lens")
        .first()
    )
    if not product:
        product = db.query(ProductModel).filter(ProductModel.sku == sku).first()
    if not product:
        raise HTTPException(status_code=404, detail="Contact lens not found")

    attrs: Dict[str, Any] = dict(product.attributes or {})
    if attrs.get("product_type") != "contact_lens":
        attrs["product_type"] = "contact_lens"
    variants: List[Dict[str, Any]] = attrs.get("variants", [])

    lens_type = attrs.get("lens_type")
    if not lens_type:
        raise HTTPException(status_code=400, detail="Lens type unspecified for this product")

    sphere = payload.sphere
    cylinder = payload.cylinder
    axis = payload.axis
    addition = payload.addition
    addition_label = (payload.addition_label or "").strip() or None

    if lens_type == "spherical":
        cylinder = None
        axis = None
        addition = None
        addition_label = None
    elif lens_type == "astigmatic":
        if cylinder is None or axis is None:
            raise HTTPException(status_code=400, detail="Cylinder and axis are required for astigmatic variants")
        # Astigmatic variants use negative cylinders
        try:
            axis = int(axis)
        except (TypeError, ValueError):
            raise HTTPException(status_code=400, detail="Axis must be an integer between 0 and 180")
        if axis < 0 or axis > 180:
            raise HTTPException(status_code=400, detail="Axis must be in the 0-180 range")
        if cylinder > 0:
            cylinder = -cylinder
        addition = None
        addition_label = None
    elif lens_type == "multifocal":
        scheme = attrs.get("addition_scheme")
        if not scheme:
            raise HTTPException(status_code=400, detail="Addition scheme missing for multifocal lens")
        if not addition_label:
            raise HTTPException(status_code=400, detail="Addition label is required for multifocal variants")
        if scheme == "DN_RANGE":
            if addition is None:
                raise HTTPException(status_code=400, detail="Addition numeric value is required for DN_RANGE variants")
        else:
            addition = None
        cylinder = None
        axis = None
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported lens type: {lens_type}")

    candidate_signature = _variant_signature(
        {
            "sphere": sphere,
            "cylinder": cylinder,
            "axis": axis,
            "addition": addition,
            "addition_label": addition_label,
        }
    )
    if any(_variant_signature(v) == candidate_signature for v in variants):
        raise HTTPException(status_code=400, detail="Variant already exists for this lens")

    new_variant = {
        "sphere": sphere,
        "cylinder": cylinder,
        "axis": axis,
        "addition": addition,
        "addition_label": addition_label,
        "ean": payload.ean,
        "availability": payload.availability,
        "quantity": int(payload.quantity) if payload.quantity is not None else 0,
    }
    variants.append(new_variant)
    attrs["variants"] = variants

    if any(v.get("availability") == "in_stock" and v.get("quantity", 0) > 0 for v in variants):
        attrs["availability"] = "in_stock"
        product.status = "in_stock"
        product.visible = True
    elif any(v.get("availability") == "preorder" for v in variants):
        attrs["availability"] = "preorder"
        product.status = "preorder"
        product.visible = True
    else:
        attrs["availability"] = "unavailable"
        product.status = "unavailable"
        product.visible = False

    product.attributes = attrs
    product.version = (product.version or 0) + 1

    db.add(product)
    db.commit()
    db.refresh(product)

    log_admin_action(
        db=db,
        admin=current_admin,
        action="contact_lens_variant_create",
        resource_type="product",
        resource_id=product.id,
        metadata={
            "sku": product.sku,
            "variant": {
                "sphere": sphere,
                "cylinder": cylinder,
                "axis": axis,
                "addition": addition,
                "addition_label": addition_label,
            },
            "variants_total": len(variants),
        },
        request=request,
    )

    return {
        "ok": True,
        "variant": new_variant,
        "variants_total": len(variants),
        "availability": attrs["availability"],
    }


@router.put("/{sku}/variants")
def update_contact_lens_variants(
    sku: str,
    payload: ContactLensVariantsUpdatePayload,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    """
    Bulk update availability and quantity for variants of a contact lens.
    Matching is done by (sphere, cylinder, axis, addition, addition_label).
    """
    product = (
        db.query(ProductModel)
        .filter(ProductModel.sku == sku)
        .filter(ProductModel.attributes["product_type"].astext == "contact_lens")
        .first()
    )
    if not product:
        # Fallback for legacy records that were created without product_type
        product = db.query(ProductModel).filter(ProductModel.sku == sku).first()

    if not product:
        raise HTTPException(status_code=404, detail="Contact lens not found")

    attrs: Dict[str, Any] = dict(product.attributes or {})
    if attrs.get("product_type") != "contact_lens":
        attrs["product_type"] = "contact_lens"
    variants: List[Dict[str, Any]] = attrs.get("variants", [])

    if not variants:
        raise HTTPException(
            status_code=400,
            detail="No variants defined for this contact lens",
        )

    updated_variants: List[Dict[str, Any]] = []
    for upd in payload.variants:
        updated_variants.append(
            {
                "sphere": upd.sphere,
                "cylinder": upd.cylinder,
                "axis": upd.axis,
                "addition": upd.addition,
                "addition_label": upd.addition_label,
                "ean": upd.ean,
                "availability": upd.availability,
                "quantity": int(upd.quantity) if upd.quantity is not None else 0,
            }
        )

    updated_count = len(updated_variants)
    attrs["variants"] = updated_variants

    # Derive base availability from variants (simple rule)
    if any(v.get("availability") == "in_stock" and v.get("quantity", 0) > 0 for v in updated_variants):
        attrs["availability"] = "in_stock"
        product.status = "in_stock"
        product.visible = True
    elif any(v.get("availability") == "preorder" for v in updated_variants):
        attrs["availability"] = "preorder"
        product.status = "preorder"
        product.visible = True
    else:
        attrs["availability"] = "unavailable"
        product.status = "unavailable"
        product.visible = False

    product.attributes = attrs
    product.version = (product.version or 0) + 1

    db.add(product)
    db.commit()
    db.refresh(product)

    log_admin_action(
        db=db,
        admin=current_admin,
        action="contact_lens_variants_update",
        resource_type="product",
        resource_id=product.id,
        metadata={
            "sku": product.sku,
            "updated_count": updated_count,
            "variants_total": len(variants),
            "availability": attrs["availability"],
        },
        request=request,
    )

    return {
        "ok": True,
        "updated_count": updated_count,
        "availability": attrs["availability"],
        "variants_total": len(variants),
    }


@router.delete("/{sku}")
def delete_contact_lens(
    sku: str,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    """
    Permanently delete a contact lens product (base + variants) by SKU.
    """
    product = (
        db.query(ProductModel)
        .filter(ProductModel.sku == sku)
        .filter(ProductModel.attributes["product_type"].astext == "contact_lens")
        .first()
    )

    if not product:
        raise HTTPException(status_code=404, detail="Contact lens not found")

    db.delete(product)
    db.commit()

    log_admin_action(
        db=db,
        admin=current_admin,
        action="contact_lens_delete",
        resource_type="product",
        resource_id=product.id,
        metadata={"sku": product.sku, "slug": product.slug},
        request=request,
    )

    return {"ok": True, "sku": sku}


@router.delete("/{sku}/variants")
def delete_contact_lens_variant(
    sku: str,
    request: Request,
    key: ContactLensVariantKey = Body(...),
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    """
    Delete a single variant (by optical parameters) from a contact lens.
    """
    product = (
        db.query(ProductModel)
        .filter(ProductModel.sku == sku)
        .filter(ProductModel.attributes["product_type"].astext == "contact_lens")
        .first()
    )
    if not product:
        product = db.query(ProductModel).filter(ProductModel.sku == sku).first()
    if not product:
        raise HTTPException(status_code=404, detail="Contact lens not found")

    attrs: Dict[str, Any] = dict(product.attributes or {})
    variants: List[Dict[str, Any]] = attrs.get("variants", [])

    if not variants:
        raise HTTPException(status_code=400, detail="No variants to delete")

    remaining: List[Dict[str, Any]] = []
    deleted = False
    for v in variants:
        if not deleted and _variant_match_key(v, key):
            deleted = True
            continue
        remaining.append(v)

    if not deleted:
        raise HTTPException(status_code=404, detail="Variant not found")

    attrs["variants"] = remaining
    if attrs.get("product_type") != "contact_lens":
        attrs["product_type"] = "contact_lens"

    # recompute availability based on remaining
    if any(v.get("availability") == "in_stock" and v.get("quantity", 0) > 0 for v in remaining):
        attrs["availability"] = "in_stock"
        product.status = "in_stock"
        product.visible = True
    elif any(v.get("availability") == "preorder" for v in remaining):
        attrs["availability"] = "preorder"
        product.status = "preorder"
        product.visible = True
    else:
        attrs["availability"] = "unavailable"
        product.status = "unavailable"
        product.visible = False

    product.attributes = attrs
    product.version = (product.version or 0) + 1

    db.add(product)
    db.commit()
    db.refresh(product)

    log_admin_action(
        db=db,
        admin=current_admin,
        action="contact_lens_variant_delete",
        resource_type="product",
        resource_id=product.id,
        metadata={
            "sku": product.sku,
            "variant_deleted": key.model_dump(),
            "variants_remaining": len(remaining),
        },
        request=request,
    )

    return {
        "ok": True,
        "sku": sku,
        "variants_remaining": len(remaining),
        "availability": attrs.get("availability"),
    }
