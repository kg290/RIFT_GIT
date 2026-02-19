"""
WhistleChain — IPFS Upload via Pinata
======================================
Uploads encrypted evidence bundles to IPFS through the Pinata
pinning service, returning the immutable content hash (CID).
"""

import os
import json
import requests
import tempfile
from dotenv import load_dotenv

load_dotenv()

PINATA_JWT = os.getenv("PINATA_JWT", "")
PINATA_PIN_FILE_URL = "https://api.pinata.cloud/pinning/pinFileToIPFS"
PINATA_PIN_JSON_URL = "https://api.pinata.cloud/pinning/pinJSONToIPFS"
PINATA_GATEWAY = "https://gateway.pinata.cloud/ipfs"


def _headers() -> dict:
    """Auth headers for Pinata API."""
    return {"Authorization": f"Bearer {PINATA_JWT}"}


def upload_file_to_ipfs(file_path: str, name: str | None = None) -> dict:
    """
    Upload a single file to IPFS via Pinata.

    Args:
        file_path: Path to the file to upload.
        name: Optional name for the pin.

    Returns:
        dict with keys: IpfsHash, PinSize, Timestamp
    """
    if not PINATA_JWT:
        raise ValueError("PINATA_JWT not set in environment")

    metadata = json.dumps({"name": name or os.path.basename(file_path)})
    with open(file_path, "rb") as f:
        response = requests.post(
            PINATA_PIN_FILE_URL,
            headers=_headers(),
            files={"file": (os.path.basename(file_path), f)},
            data={"pinataMetadata": metadata},
        )

    response.raise_for_status()
    return response.json()


def upload_bytes_to_ipfs(data: bytes, filename: str = "evidence_bundle.json") -> dict:
    """
    Upload raw bytes to IPFS via Pinata.

    Args:
        data: Bytes to upload (e.g. encrypted bundle JSON).
        filename: Name to assign to the pinned file.

    Returns:
        dict with keys: IpfsHash, PinSize, Timestamp
    """
    if not PINATA_JWT:
        raise ValueError("PINATA_JWT not set in environment")

    metadata = json.dumps({"name": filename})

    # Write to a temp file, then upload
    with tempfile.NamedTemporaryFile(delete=False, suffix=".json") as tmp:
        tmp.write(data)
        tmp_path = tmp.name

    try:
        with open(tmp_path, "rb") as f:
            response = requests.post(
                PINATA_PIN_FILE_URL,
                headers=_headers(),
                files={"file": (filename, f)},
                data={"pinataMetadata": metadata},
            )
        response.raise_for_status()
        return response.json()
    finally:
        os.unlink(tmp_path)


def upload_json_to_ipfs(data: dict, name: str = "evidence_metadata") -> dict:
    """
    Pin a JSON object directly to IPFS via Pinata.

    Args:
        data: Dict to serialize and pin.
        name: Pin name.

    Returns:
        dict with keys: IpfsHash, PinSize, Timestamp
    """
    if not PINATA_JWT:
        raise ValueError("PINATA_JWT not set in environment")

    payload = {
        "pinataContent": data,
        "pinataMetadata": {"name": name},
    }

    response = requests.post(
        PINATA_PIN_JSON_URL,
        headers={**_headers(), "Content-Type": "application/json"},
        json=payload,
    )
    response.raise_for_status()
    return response.json()


def get_ipfs_url(cid: str) -> str:
    """Return a public IPFS gateway URL for a given CID."""
    return f"https://ipfs.io/ipfs/{cid}"


def get_pinata_gateway_url(cid: str) -> str:
    """Return the Pinata gateway URL for a given CID."""
    return f"{PINATA_GATEWAY}/{cid}"
