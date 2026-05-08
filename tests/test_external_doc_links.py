"""Verify external doc links to docs.everythingsmart.io are still alive.

User-guide pages link out to Everything Smart's hosted docs (CO₂ module install,
hardware overview). If those upstream pages move or are removed, our links break
silently. This test discovers every link to that domain under docs/ and confirms
each one responds successfully.

Skips when the network is unreachable so offline development isn't blocked.
"""

from __future__ import annotations

import re
import socket
from collections.abc import Iterator
from pathlib import Path
from urllib.error import HTTPError
from urllib.error import URLError
from urllib.request import Request
from urllib.request import urlopen

import pytest
import pytest_socket

REPO_ROOT = Path(__file__).resolve().parents[1]
DOCS_ROOT = REPO_ROOT / "docs"
URL_PATTERN = re.compile(r"https://docs\.everythingsmart\.io/[^\s)\"<>\]]+")
TRAILING_PUNCT = ".,);:'\""
TIMEOUT = 15
USER_AGENT = "epp-grid-link-check/1.0"


def _discover_links(root: Path) -> list[str]:
    """Return sorted unique docs.everythingsmart.io URLs referenced under root."""
    found: set[str] = set()
    for md in root.rglob("*.md"):
        for match in URL_PATTERN.findall(md.read_text(encoding="utf-8")):
            found.add(match.rstrip(TRAILING_PUNCT))
    return sorted(found)


def _network_available() -> bool:
    # Some HA test environments patch DNS to raise RuntimeError instead of OSError —
    # treat any failure as "network unavailable" so the test skips cleanly.
    try:
        socket.gethostbyname("docs.everythingsmart.io")
    except Exception:
        return False
    return True


def _check(url: str) -> int:
    """Return HTTP status for url. Raises HTTPError on 4xx/5xx, URLError on network error."""
    last_exc: HTTPError | None = None
    for method in ("HEAD", "GET"):
        req = Request(url, method=method, headers={"User-Agent": USER_AGENT})
        try:
            with urlopen(req, timeout=TIMEOUT) as resp:
                return int(resp.status)
        except HTTPError as e:
            # Some servers reject HEAD with 403/405 — retry with GET.
            if method == "HEAD" and e.code in (403, 405):
                last_exc = e
                continue
            raise
    assert last_exc is not None
    raise last_exc


LINKS = _discover_links(DOCS_ROOT)


@pytest.fixture
def network_unblocked() -> Iterator[None]:
    """Fully clear pytest-socket restrictions so the test can reach real hosts.

    The HA test plugin pins connections to 127.0.0.1 before each test; the
    `enable_socket` marker alone only un-patches socket creation, not the
    connect-host filter. _remove_restrictions undoes both.
    """
    pytest_socket._remove_restrictions()
    yield


def test_discover_links_extracts_unique_sorted_urls(tmp_path: Path) -> None:
    """Discovery finds docs.everythingsmart.io URLs across markdown, deduped, trailing punct stripped."""
    (tmp_path / "a.md").write_text(
        "see [guide](https://docs.everythingsmart.io/page-1).\n"
        "and [other](https://example.com/x).\n",  # different domain — ignored
    )
    sub = tmp_path / "sub"
    sub.mkdir()
    (sub / "b.md").write_text(
        "duplicate https://docs.everythingsmart.io/page-1\n"
        "and https://docs.everythingsmart.io/page-2.\n",  # trailing dot stripped
    )
    assert _discover_links(tmp_path) == [
        "https://docs.everythingsmart.io/page-1",
        "https://docs.everythingsmart.io/page-2",
    ]


def test_link_checker_catches_broken_url(network_unblocked: None) -> None:
    """Sanity-check the checker itself: a known-404 URL must raise HTTPError.

    Without this, a bug that silently swallows errors would let the parametrized
    test pass even when upstream docs disappear.
    """
    if not _network_available():
        pytest.skip("Network unavailable")
    # Use the same /s/products/doc/ path shape as our real links so the 404
    # comes from the doc handler rather than the SPA root catch-all (which
    # returns 200 for unknown top-level paths).
    with pytest.raises(HTTPError) as excinfo:
        _check("https://docs.everythingsmart.io/s/products/doc/this-page-does-not-exist-xyz9c8d7f")
    assert excinfo.value.code == 404


@pytest.mark.skipif(not LINKS, reason="No docs.everythingsmart.io links found in docs/")
@pytest.mark.parametrize("url", LINKS)
def test_external_doc_link_is_alive(url: str, network_unblocked: None) -> None:
    if not _network_available():
        pytest.skip("Network unavailable")
    try:
        status = _check(url)
    except HTTPError as e:
        pytest.fail(f"{url} → HTTP {e.code} {e.reason}")
    except URLError as e:
        pytest.fail(f"{url} → unreachable: {e.reason}")
    assert 200 <= status < 400, f"{url} → unexpected status {status}"
