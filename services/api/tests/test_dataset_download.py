"""A fresh deployment must import the pinned CSV, never arbitrary archive paths."""

import io
import zipfile
from pathlib import Path

import pytest

from app.cli.fetch_dataset import write_validated_csv

SAMPLE_DIGEST = "af2bdbe1aa9b6ec1e2ade1d694f41fc71a831d0268e9891562113d8a62add1bf"


def archive(payload: bytes, member: str = "updated_data.csv") -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as output:
        output.writestr(member, payload)
    return buffer.getvalue()


def test_download_checks_hash_before_creating_csv(tmp_path: Path) -> None:
    path = tmp_path / "data.csv"
    with pytest.raises(ValueError, match="SHA-256"):
        write_validated_csv(archive(b"tampered"), path, expected_digest=SAMPLE_DIGEST)
    assert not path.exists()
    write_validated_csv(archive(b"sample"), path, expected_digest=SAMPLE_DIGEST)
    assert path.read_bytes() == b"sample"


def test_download_refuses_unexpected_archive_and_existing_file(tmp_path: Path) -> None:
    path = tmp_path / "data.csv"
    with pytest.raises(ValueError):
        write_validated_csv(archive(b"sample", "../updated_data.csv"), path)
    path.write_bytes(b"my own file")
    with pytest.raises(FileExistsError):
        write_validated_csv(archive(b"sample"), path, expected_digest=SAMPLE_DIGEST)
    assert path.read_bytes() == b"my own file"
