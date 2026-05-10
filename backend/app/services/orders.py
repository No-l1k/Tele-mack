from ..models import Order, OrderItem

PIXEL_CHECK_COST = 1500
INSTALLATION_COST = 3000


def _item_sku(item: OrderItem) -> str | None:
    """Артикул из строки заказа или из актуальной карточки товара (старые заказы)."""
    if item.product_sku and str(item.product_sku).strip():
        return str(item.product_sku).strip()
    if item.product is not None and item.product.sku:
        s = str(item.product.sku).strip()
        return s or None
    return None


def order_to_dict(order: Order) -> dict:
    items = [
        {
            "productId": item.product_id,
            "productName": item.product_name,
            "productImage": item.product_image or "",
            "sku": _item_sku(item),
            "price": item.price,
            "quantity": item.quantity,
            "total": item.total,
        }
        for item in order.items
    ]
    subtotal = sum(item["total"] for item in items)
    selected_services = order.selected_services if isinstance(order.selected_services, list) else []
    services_total = int(order.services_total or 0)
    if services_total == 0 and selected_services:
        services_total = sum(max(int((service or {}).get("price", 0) or 0), 0) for service in selected_services)
    if services_total == 0:
        if order.pixel_check:
            services_total += PIXEL_CHECK_COST
        if order.installation:
            services_total += INSTALLATION_COST
    payment_surcharge = int(subtotal * 0.15) if order.payment_method == "card" else 0
    delivery_cost = max(order.total - subtotal - payment_surcharge - services_total, 0)
    return {
        "id": order.id,
        "number": order.id,
        "status": order.status,
        "items": items,
        "subtotal": subtotal,
        "deliveryCost": delivery_cost,
        "paymentSurcharge": payment_surcharge,
        "total": order.total,
        "deliveryMethod": order.delivery_method,
        "paymentMethod": order.payment_method,
        "paymentStatus": order.payment_status,
        "customer": {
            "name": order.customer_name,
            "phone": order.customer_phone,
            "email": order.customer_email,
        },
        "address": {
            "city": order.address_city,
            "street": order.address_street,
            "house": order.address_house,
            "apartment": order.address_apartment,
        }
        if order.address_city or order.address_street or order.address_house
        else None,
        "comment": order.comment,
        "services": {"pixelCheck": order.pixel_check, "installation": order.installation},
        "selectedServices": selected_services,
        "servicesTotal": services_total,
        "createdAt": order.created_at,
        "updatedAt": order.updated_at,
    }
