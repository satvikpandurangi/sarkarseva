"""Fetch Kaggle version 1 and validate the original CSV by a pinned digest."""

import argparse
import hashlib
import io
import os
import tempfile
import zipfile
from pathlib import Path
from urllib.request import Request, urlopen

from app.db.kaggle_import import CSV_SHA256

DOWNLOAD_URL = (
    "https://www.kaggle.com/api/v1/datasets/download/"
    "jainamgada45/indian-government-schemes?datasetVersionNumber=1"
)
MAX_BYTES = 20 * 1024 * 1024


def write_validated_csv(
    archive_bytes: bytes, output: Path, *, expected_digest: str = CSV_SHA256
) -> None:
    try:
        with zipfile.ZipFile(io.BytesIO(archive_bytes)) as archive:
            info = archive.getinfo("updated_data.csv")
            if info.file_size > MAX_BYTES:
                raise ValueError("Dataset CSV exceeds the supported size")
            content = archive.read(info)
    except (KeyError, zipfile.BadZipFile) as error:
        raise ValueError("Dataset archive does not contain the expected CSV") from error
    if hashlib.sha256(content).hexdigest() != expected_digest:
        raise ValueError("Dataset SHA-256 differs from reviewed version 1; import stopped")
    if output.exists():
        if hashlib.sha256(output.read_bytes()).hexdigest() == expected_digest:
            return
        raise FileExistsError("Refusing to overwrite a different local dataset")
    output.parent.mkdir(parents=True, exist_ok=True)
    # A partial download/write can never become the import input.
    with tempfile.NamedTemporaryFile(dir=output.parent, delete=False) as temporary:
        temporary.write(content)
        temporary_path = Path(temporary.name)
    try:
        os.replace(temporary_path, output)
    finally:
        temporary_path.unlink(missing_ok=True)


def fetch_dataset(output: Path) -> None:
    if output.exists() and hashlib.sha256(output.read_bytes()).hexdigest() == CSV_SHA256:
        return
    request = Request(DOWNLOAD_URL, headers={"User-Agent": "SarkarSeva-dataset-import/1.0"})
    with urlopen(request, timeout=60) as response:
        payload = response.read(MAX_BYTES + 1)
    if len(payload) > MAX_BYTES:
        raise ValueError("Dataset archive exceeds the supported size")
    write_validated_csv(payload, output)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=Path("data/updated_data.csv"))
    args = parser.parse_args()
    fetch_dataset(args.output)
    print(f"Validated Kaggle version 1 CSV: {args.output}")


if __name__ == "__main__":
    main()
