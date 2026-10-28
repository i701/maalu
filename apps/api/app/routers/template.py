import uuid

from fastapi import APIRouter, HTTPException, Response, status

from app.dependencies import CurrentUserId, TemplateServiceDep
from app.models import TransactionTemplate
from app.pagination import PageDep, set_total
from app.schemas import TemplateCreate, TemplateResponse, TemplateUpdate
from app.services import (
    AccountNotFoundError,
    TemplateNameTakenError,
    TransactionRuleError,
    VendorNotFoundError,
)

router = APIRouter(prefix="/templates", tags=["templates"])

_NAME_TAKEN = HTTPException(status.HTTP_409_CONFLICT, "A template with this name already exists")
_ACCOUNT_NOT_FOUND = HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Account not found")
_VENDOR_NOT_FOUND = HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Vendor not found")


async def _get_or_404(
    service: TemplateServiceDep, user_id: uuid.UUID, template_id: uuid.UUID
) -> TransactionTemplate:
    template = await service.get(user_id, template_id)
    if template is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Template not found")
    return template


@router.post("", response_model=TemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_template(
    data: TemplateCreate, user_id: CurrentUserId, service: TemplateServiceDep
):
    """Save a starting point for a transaction. Choosing it later pre-fills the form."""
    try:
        return await service.create(user_id, data)
    except TemplateNameTakenError:
        raise _NAME_TAKEN from None
    except AccountNotFoundError:
        raise _ACCOUNT_NOT_FOUND from None
    except VendorNotFoundError:
        raise _VENDOR_NOT_FOUND from None
    except TransactionRuleError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(exc)) from None


@router.get("", response_model=list[TemplateResponse])
async def list_templates(
    user_id: CurrentUserId, service: TemplateServiceDep, response: Response, page: PageDep
):
    """All templates by name, or one page with `limit`/`offset`. The total is in `X-Total-Count`."""
    set_total(response, await service.count_for_user(user_id))
    return await service.list_for_user(user_id, limit=page.limit, offset=page.offset)


@router.get("/{template_id}", response_model=TemplateResponse)
async def get_template(template_id: uuid.UUID, user_id: CurrentUserId, service: TemplateServiceDep):
    return await _get_or_404(service, user_id, template_id)


@router.patch("/{template_id}", response_model=TemplateResponse)
async def rename_template(
    template_id: uuid.UUID,
    data: TemplateUpdate,
    user_id: CurrentUserId,
    service: TemplateServiceDep,
):
    template = await _get_or_404(service, user_id, template_id)
    try:
        return await service.rename(template, data.name)
    except TemplateNameTakenError:
        raise _NAME_TAKEN from None


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_template(
    template_id: uuid.UUID, user_id: CurrentUserId, service: TemplateServiceDep
):
    template = await _get_or_404(service, user_id, template_id)
    await service.delete(template)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
