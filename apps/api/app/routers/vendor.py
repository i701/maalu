import uuid

from fastapi import APIRouter, HTTPException, Response, status

from app.dependencies import CurrentUserId, VendorServiceDep
from app.models import Vendor
from app.schemas import VendorCreate, VendorResponse, VendorUpdate
from app.services import VendorNameTakenError

router = APIRouter(prefix="/vendors", tags=["vendors"])

_NAME_TAKEN = HTTPException(status.HTTP_409_CONFLICT, "Vendor name already exists")


async def _get_or_404(
    service: VendorServiceDep, user_id: uuid.UUID, vendor_id: uuid.UUID
) -> Vendor:
    vendor = await service.get(user_id, vendor_id)
    if vendor is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Vendor not found")
    return vendor


@router.post("", response_model=VendorResponse, status_code=status.HTTP_201_CREATED)
async def create_vendor(data: VendorCreate, user_id: CurrentUserId, service: VendorServiceDep):
    try:
        return await service.create(user_id, data)
    except VendorNameTakenError:
        raise _NAME_TAKEN from None


@router.get("", response_model=list[VendorResponse])
async def list_vendors(user_id: CurrentUserId, service: VendorServiceDep):
    return await service.list_for_user(user_id)


@router.get("/{vendor_id}", response_model=VendorResponse)
async def get_vendor(vendor_id: uuid.UUID, user_id: CurrentUserId, service: VendorServiceDep):
    return await _get_or_404(service, user_id, vendor_id)


@router.patch("/{vendor_id}", response_model=VendorResponse)
async def update_vendor(
    vendor_id: uuid.UUID, data: VendorUpdate, user_id: CurrentUserId, service: VendorServiceDep
):
    vendor = await _get_or_404(service, user_id, vendor_id)
    try:
        return await service.update(vendor, data)
    except VendorNameTakenError:
        raise _NAME_TAKEN from None


@router.delete("/{vendor_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_vendor(vendor_id: uuid.UUID, user_id: CurrentUserId, service: VendorServiceDep):
    """Transactions that used this vendor are kept and become vendor-less."""
    vendor = await _get_or_404(service, user_id, vendor_id)
    await service.delete(vendor)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
