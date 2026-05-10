import pytest

from app.rate_limit import _WINDOWS


@pytest.fixture(autouse=True)
def reset_rate_limit_windows():
    _WINDOWS.clear()
    yield
    _WINDOWS.clear()
