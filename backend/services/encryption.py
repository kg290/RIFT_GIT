"""
WhistleChain — AES-256 File Encryption Module
==============================================
Encrypts evidence files before IPFS upload so that only the
whistleblower (who holds the key) can decrypt them.

Uses AES-256-GCM for authenticated encryption.
"""

import os
import json
import base64
from Crypto.Cipher import AES
from Crypto.Random import get_random_bytes


def generate_encryption_key() -> bytes:
    """Generate a random 256-bit AES key."""
    return get_random_bytes(32)


def encrypt_file(file_path: str, key: bytes) -> tuple[bytes, bytes, bytes]:
    """
    Encrypt a file with AES-256-GCM.

    Args:
        file_path: Path to the plaintext file.
        key: 32-byte AES key.

    Returns:
        (ciphertext, nonce, tag) — all bytes.
    """
    with open(file_path, "rb") as f:
        plaintext = f.read()

    cipher = AES.new(key, AES.MODE_GCM)
    ciphertext, tag = cipher.encrypt_and_digest(plaintext)
    return ciphertext, cipher.nonce, tag


def decrypt_file(ciphertext: bytes, key: bytes, nonce: bytes, tag: bytes) -> bytes:
    """
    Decrypt AES-256-GCM ciphertext.

    Args:
        ciphertext: Encrypted data.
        key: 32-byte AES key.
        nonce: Nonce used during encryption.
        tag: Authentication tag.

    Returns:
        Decrypted plaintext bytes.
    """
    cipher = AES.new(key, AES.MODE_GCM, nonce=nonce)
    return cipher.decrypt_and_verify(ciphertext, tag)


def encrypt_bytes(data: bytes, key: bytes) -> tuple[bytes, bytes, bytes]:
    """
    Encrypt raw bytes with AES-256-GCM.

    Returns:
        (ciphertext, nonce, tag)
    """
    cipher = AES.new(key, AES.MODE_GCM)
    ciphertext, tag = cipher.encrypt_and_digest(data)
    return ciphertext, cipher.nonce, tag


def encrypt_files_to_bundle(file_paths: list[str], key: bytes) -> bytes:
    """
    Encrypt multiple files into a single JSON bundle.

    Each file is encrypted individually, and the result is a JSON
    structure containing base64-encoded ciphertext + metadata.

    Args:
        file_paths: List of file paths to encrypt.
        key: 32-byte AES key.

    Returns:
        JSON bytes ready for IPFS upload.
    """
    bundle = {
        "version": 1,
        "encryption": "AES-256-GCM",
        "files": [],
    }

    for fp in file_paths:
        filename = os.path.basename(fp)
        ciphertext, nonce, tag = encrypt_file(fp, key)
        bundle["files"].append({
            "filename": filename,
            "size": os.path.getsize(fp),
            "ciphertext": base64.b64encode(ciphertext).decode(),
            "nonce": base64.b64encode(nonce).decode(),
            "tag": base64.b64encode(tag).decode(),
        })

    return json.dumps(bundle, indent=2).encode("utf-8")


def decrypt_bundle(bundle_bytes: bytes, key: bytes) -> dict[str, bytes]:
    """
    Decrypt a JSON bundle back into individual files.

    Args:
        bundle_bytes: The JSON bundle from encrypt_files_to_bundle.
        key: 32-byte AES key.

    Returns:
        Dict mapping filename → decrypted bytes.
    """
    bundle = json.loads(bundle_bytes)
    result = {}

    for entry in bundle["files"]:
        ciphertext = base64.b64decode(entry["ciphertext"])
        nonce = base64.b64decode(entry["nonce"])
        tag = base64.b64decode(entry["tag"])

        plaintext = decrypt_file(ciphertext, key, nonce, tag)
        result[entry["filename"]] = plaintext

    return result


def key_to_hex(key: bytes) -> str:
    """Convert key to hex string for safe storage/display."""
    return key.hex()


def key_from_hex(hex_str: str) -> bytes:
    """Restore key from hex string."""
    return bytes.fromhex(hex_str)
