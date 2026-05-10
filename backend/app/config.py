from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Tele-makc API"
    environment: str = "development"
    api_prefix: str = "/api"
    secret_key: str = "change-me-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24
    database_url: str = "sqlite:///./tele_makc.db"
    admin_login: str = "admin"
    admin_password: str = "admin123"
    db_auto_create: bool = True
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"
    trusted_hosts: str = "localhost,127.0.0.1,testserver"
    allow_dev_auth_codes: bool = True
    dev_sms_code: str = "1234"
    allow_admin_bootstrap: bool = True
    expose_docs: bool = True
    max_upload_size_bytes: int = 5 * 1024 * 1024
    allowed_image_mime_types: str = "image/jpeg,image/png,image/webp"
    smtp_host: str = ""
    smtp_port: int = 465
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = ""
    order_notify_to: str = ""
    frontend_base_url: str = "http://localhost:3000"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def trusted_host_list(self) -> list[str]:
        return [host.strip() for host in self.trusted_hosts.split(",") if host.strip()]

    @property
    def order_notify_to_list(self) -> list[str]:
        return [email.strip() for email in self.order_notify_to.split(",") if email.strip()]

    def validate_runtime_security(self) -> None:
        if not self.is_production:
            return

        weak_values = {"", "change-me-in-production", "admin123", "replace-with-a-strong-password"}
        if self.secret_key in weak_values or len(self.secret_key) < 32:
            raise RuntimeError("SECRET_KEY must be a strong production secret")
        if self.admin_password in weak_values or len(self.admin_password) < 12:
            raise RuntimeError("ADMIN_PASSWORD must be strong in production")
        if self.allow_dev_auth_codes:
            raise RuntimeError("ALLOW_DEV_AUTH_CODES must be false in production")
        if self.allow_admin_bootstrap:
            raise RuntimeError("ALLOW_ADMIN_BOOTSTRAP must be false in production")
        if self.db_auto_create:
            raise RuntimeError("DB_AUTO_CREATE must be false in production")
        if "*" in self.cors_origin_list:
            raise RuntimeError("CORS_ORIGINS must not contain wildcard in production")


settings = Settings()
