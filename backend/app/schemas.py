from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class ApiResponse(BaseModel):
    success: bool = True
    message: str | None = None
    data: Any | None = None


class UserBase(BaseModel):
    phone: str
    email: str | None = None
    name: str


class UserOut(UserBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    role: str
    created_at: datetime


class AdminLoginIn(BaseModel):
    login: str
    password: str


class CategoryBase(BaseModel):
    name: str
    slug: str
    parentId: int | None = None
    image: str | None = None
    description: str | None = None
    order: int = 0
    showOnHome: bool = False


class CategoryUpdateIn(BaseModel):
    name: str | None = None
    slug: str | None = None
    parentId: int | None = None
    image: str | None = None
    description: str | None = None
    order: int | None = None
    showOnHome: bool | None = None


class CategoryOut(CategoryBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    productCount: int = 0


class ProductBase(BaseModel):
    name: str
    slug: str
    description: str
    shortDescription: str | None = None
    price: int
    oldPrice: int | None = None
    categoryId: int
    categoryIds: list[int] = Field(default_factory=list)
    categorySlug: str | None = None
    brand: str = ""
    sku: str | None = None
    gtin: str | None = None
    specs: dict = {}
    inStock: bool = True
    stockStatus: str = "in_stock"
    isNew: bool = False
    ratingMode: str = "manual"
    rating: float = Field(default=4.8, ge=0, le=5.0)
    reviewsCount: int = Field(default=0, ge=0)
    warrantyMonths: int | None = Field(default=None, ge=0)
    warrantyType: str | None = None
    serviceInfo: str | None = None
    recommendedAccessoryIds: list[int] = Field(default_factory=list)
    variantGroup: str | None = None
    variantName: str | None = None
    variantValue: str | None = None
    metaTitle: str | None = None
    metaDescription: str | None = None


class ProductImagesReorderIn(BaseModel):
    """Тот же набор URL, что сейчас у товара, в новом порядке (первый = главное фото)."""

    images: list[str]


class ProductImageDeleteIn(BaseModel):
    url: str


class ProductUpdateIn(BaseModel):
    name: str | None = None
    slug: str | None = None
    description: str | None = None
    shortDescription: str | None = None
    price: int | None = None
    oldPrice: int | None = None
    categoryId: int | None = None
    categoryIds: list[int] | None = None
    addCategoryIds: list[int] | None = None
    removeCategoryIds: list[int] | None = None
    categorySlug: str | None = None
    brand: str | None = None
    sku: str | None = None
    gtin: str | None = None
    specs: dict | None = None
    inStock: bool | None = None
    stockStatus: str | None = None
    isNew: bool | None = None
    ratingMode: str | None = None
    rating: float | None = Field(default=None, ge=0, le=5.0)
    reviewsCount: int | None = Field(default=None, ge=0)
    warrantyMonths: int | None = Field(default=None, ge=0)
    warrantyType: str | None = None
    serviceInfo: str | None = None
    recommendedAccessoryIds: list[int] | None = None
    variantGroup: str | None = None
    variantName: str | None = None
    variantValue: str | None = None
    metaTitle: str | None = None
    metaDescription: str | None = None


class ProductOut(ProductBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    images: list[str] = []
    rating: float = 0
    reviewsCount: int = 0
    createdAt: datetime


class OrderItemCreate(BaseModel):
    productId: int
    quantity: int = Field(default=1, gt=0, le=999)


class OrderItemUpdate(BaseModel):
    """Позиция при редактировании заказа (admin): можно снизить цену только в этом заказе."""

    productId: int
    quantity: int = Field(default=1, gt=0, le=999)
    price: int | None = Field(
        default=None,
        gt=0,
        description="Цена за единицу в рублях; не выше цены в каталоге",
    )


class OrderCreate(BaseModel):
    items: list[OrderItemCreate] = Field(min_length=1)
    phone: str
    name: str
    email: str | None = None
    city: str | None = None
    street: str | None = None
    house: str | None = None
    apartment: str | None = None
    deliveryMethod: str = "courier"
    paymentMethod: str = "cash"
    comment: str | None = None
    serviceIds: list[str] = Field(default_factory=list)
    pixelCheck: bool = False
    installation: bool = False
    becomeCustomer: bool = False


class OrderUpdate(BaseModel):
    """Полное обновление заказа (admin)."""

    items: list[OrderItemUpdate] = Field(min_length=1)
    phone: str
    name: str
    email: str | None = None
    city: str | None = None
    street: str | None = None
    house: str | None = None
    apartment: str | None = None
    deliveryMethod: str = "courier"
    paymentMethod: str = "cash"
    comment: str | None = None
    serviceIds: list[str] = Field(default_factory=list)
    pixelCheck: bool = False
    installation: bool = False


class OrderStatusUpdate(BaseModel):
    status: str


class OrderPublicLookupIn(BaseModel):
    orderNumber: int = Field(gt=0)
    phone: str = Field(min_length=5, max_length=32)


class ContactRequestIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    phone: str = Field(min_length=5, max_length=32)
    email: str | None = Field(default=None, max_length=255)
    subject: str | None = Field(default=None, max_length=160)
    message: str = Field(min_length=5, max_length=5000)


class QuickOrderCreateIn(BaseModel):
    productId: int = Field(gt=0)
    name: str = Field(min_length=2, max_length=120)
    phone: str = Field(min_length=5, max_length=32)
    comment: str | None = Field(default=None, max_length=1000)
    quantity: int = Field(default=1, ge=1, le=999)


class CartItemIn(BaseModel):
    productId: int
    quantity: int = 1


class UserUpdateIn(BaseModel):
    name: str | None = None
    email: str | None = None


class ReviewCreateIn(BaseModel):
    rating: int
    text: str
    pros: str | None = None
    cons: str | None = None


class HeroBannerIn(BaseModel):
    image: str
    href: str | None = ""


class CheckoutServiceIn(BaseModel):
    id: str
    name: str
    price: int = Field(ge=0)
    description: str | None = None
    enabled: bool = True
    sortOrder: int = 0


class StoreDeliveryInfoIn(BaseModel):
    moscowFree: bool | None = None
    moscowMinSum: int | None = Field(default=None, ge=0)
    regionCostPerKm: int | None = Field(default=None, ge=0)
    deliveryDays: str | None = None


class StorePaymentMethodsIn(BaseModel):
    cash: bool | None = None
    card: bool | None = None
    cardSurcharge: int | None = Field(default=None, ge=0)
    pickup: bool | None = None


class StoreSocialIn(BaseModel):
    whatsapp: str | None = None
    telegram: str | None = None
    viber: str | None = None


class StoreSettingsUpdateIn(BaseModel):
    name: str | None = None
    phone: str | None = None
    email: str | None = None
    address: str | None = None
    workingHours: str | None = None
    deliveryInfo: StoreDeliveryInfoIn | None = None
    paymentMethods: StorePaymentMethodsIn | None = None
    social: StoreSocialIn | None = None
    heroBanners: list[HeroBannerIn] | None = None
    checkoutServices: list[CheckoutServiceIn] | None = None
