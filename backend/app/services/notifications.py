from __future__ import annotations

import socket
import smtplib
import ssl
from email.message import EmailMessage

from ..config import settings
from ..models import Order


class SMTP_SSL_IPV4(smtplib.SMTP_SSL):
    """
    Подключение к SMTP только по IPv4.
    На части VPS IPv6 из DNS есть, а маршрута нет — socket.create_connection даёт Errno 101.
    """

    def _get_socket(self, host, port, timeout):
        if self.debuglevel > 0:
            self._print_debug("connect (IPv4 only):", (host, port))
        last_exc: OSError | None = None
        source_address = getattr(self, "source_address", None)
        for _fam, _type, _proto, _canon, sockaddr in socket.getaddrinfo(
            host, port, socket.AF_INET, socket.SOCK_STREAM
        ):
            try:
                sock = socket.create_connection(sockaddr, timeout=timeout, source_address=source_address)
                return self.context.wrap_socket(sock, server_hostname=host)
            except OSError as exc:
                last_exc = exc
                continue
        if last_exc is not None:
            raise last_exc
        raise OSError(f"No IPv4 address for SMTP host {host!r}:{port}")

DELIVERY_METHOD_LABELS = {
    "courier": "Курьер",
    "pickup": "Самовывоз",
}

PAYMENT_METHOD_LABELS = {
    "cash": "Наличными",
    "card": "Безналичный расчет",
    "pickup": "При получении",
}


def email_notifications_enabled() -> bool:
    return bool(
        settings.smtp_host
        and settings.smtp_user
        and settings.smtp_password
        and settings.smtp_from
        and settings.order_notify_to_list
    )


def _send_email(subject: str, body: str) -> None:
    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = settings.smtp_from
    message["To"] = ", ".join(settings.order_notify_to_list)
    message.set_content(body)

    context = ssl.create_default_context()
    with SMTP_SSL_IPV4(settings.smtp_host, settings.smtp_port, context=context, timeout=15) as smtp:
        smtp.login(settings.smtp_user, settings.smtp_password)
        smtp.send_message(message)


def _format_order_email(order: Order) -> tuple[str, str]:
    formatted_total = f"{order.total:,}".replace(",", " ")
    formatted_date = order.created_at.strftime("%d.%m.%Y %H:%M")
    subject = f"Новый заказ #{order.id} на сумму {formatted_total} руб."
    admin_order_url = f"{settings.frontend_base_url.rstrip('/')}/admin/orders/{order.id}"
    delivery_method = DELIVERY_METHOD_LABELS.get(order.delivery_method, order.delivery_method)
    payment_method = PAYMENT_METHOD_LABELS.get(order.payment_method, order.payment_method)

    lines = [
        f"Поступил новый заказ #{order.id}",
        "",
        f"Дата: {formatted_date}",
        f"Сумма: {formatted_total} руб.",
        "",
        "Клиент:",
        f"- Имя: {order.customer_name}",
        f"- Телефон: {order.customer_phone}",
        f"- Email: {order.customer_email or '-'}",
        "",
        "Доставка и оплата:",
        f"- Способ доставки: {delivery_method}",
        f"- Способ оплаты: {payment_method}",
        f"- Адрес: {', '.join(part for part in [order.address_city, order.address_street, order.address_house, order.address_apartment] if part) or '-'}",
        "",
        f"Комментарий: {order.comment or '-'}",
        "",
        f"Ссылка в админке: {admin_order_url}",
        "",
        "Товары:",
    ]

    for item in order.items:
        lines.append(f"- {item.product_name} x{item.quantity} = {item.total} руб.")

    body = "\n".join(lines)
    return subject, body


def send_new_order_email(order: Order) -> None:
    subject, body = _format_order_email(order)
    _send_email(subject, body)


def send_contact_request_email(
    *,
    name: str,
    phone: str,
    email: str | None,
    subject: str | None,
    message: str,
) -> None:
    email_subject = f"Новое обращение с сайта: {subject.strip()}" if subject and subject.strip() else "Новое обращение с сайта"
    lines = [
        "Поступило новое обращение из формы контактов.",
        "",
        "Контакты клиента:",
        f"- Имя: {name}",
        f"- Телефон: {phone}",
        f"- Email: {email or '-'}",
        f"- Тема: {subject or '-'}",
        "",
        "Сообщение:",
        message,
    ]
    _send_email(email_subject, "\n".join(lines))
