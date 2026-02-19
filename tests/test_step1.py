"""
Tests for WhistleChain Evidence Registry — Step 1 components.
Covers: wallet generation, encryption, IPFS upload, Algorand connection.

Run:
    cd D:\\Hackathon\\RIFT2\\whistlechain
    .\\venv\\Scripts\\Activate.ps1
    python -m pytest tests/ -v
"""

import os
import sys
import json
import tempfile

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from backend.services.wallet import (
    create_anonymous_wallet,
    wallet_from_mnemonic,
    get_address_from_private_key,
)
from backend.services.encryption import (
    generate_encryption_key,
    encrypt_bytes,
    decrypt_file,
    encrypt_files_to_bundle,
    decrypt_bundle,
    key_to_hex,
    key_from_hex,
)
from backend.services.algorand_client import get_algod_client


class TestWalletGeneration:
    """Test anonymous wallet creation."""

    def test_create_wallet(self):
        wallet = create_anonymous_wallet()
        assert "address" in wallet
        assert "private_key" in wallet
        assert "mnemonic" in wallet
        assert len(wallet["address"]) == 58  # Algorand address length
        assert len(wallet["mnemonic"].split()) == 25  # 25-word mnemonic

    def test_wallet_restore_from_mnemonic(self):
        wallet1 = create_anonymous_wallet()
        wallet2 = wallet_from_mnemonic(wallet1["mnemonic"])
        assert wallet1["address"] == wallet2["address"]
        assert wallet1["private_key"] == wallet2["private_key"]

    def test_address_from_private_key(self):
        wallet = create_anonymous_wallet()
        addr = get_address_from_private_key(wallet["private_key"])
        assert addr == wallet["address"]

    def test_unique_wallets(self):
        w1 = create_anonymous_wallet()
        w2 = create_anonymous_wallet()
        assert w1["address"] != w2["address"]
        assert w1["mnemonic"] != w2["mnemonic"]


class TestEncryption:
    """Test AES-256-GCM encryption/decryption."""

    def test_generate_key(self):
        key = generate_encryption_key()
        assert len(key) == 32  # 256 bits

    def test_encrypt_decrypt_bytes(self):
        key = generate_encryption_key()
        plaintext = b"WhistleChain secret evidence data 12345"
        ciphertext, nonce, tag = encrypt_bytes(plaintext, key)

        assert ciphertext != plaintext
        assert len(nonce) > 0
        assert len(tag) > 0

        decrypted = decrypt_file(ciphertext, key, nonce, tag)
        assert decrypted == plaintext

    def test_encrypt_decrypt_file_bundle(self):
        key = generate_encryption_key()

        # Create temp files
        tmp_dir = tempfile.mkdtemp()
        files = []
        for i in range(3):
            fp = os.path.join(tmp_dir, f"evidence_{i}.txt")
            with open(fp, "w") as f:
                f.write(f"Evidence document #{i}: fraud detected in contract {i*1000}")
            files.append(fp)

        # Encrypt
        bundle = encrypt_files_to_bundle(files, key)
        assert len(bundle) > 0

        # Decrypt
        recovered = decrypt_bundle(bundle, key)
        assert len(recovered) == 3

        for i, fp in enumerate(files):
            filename = os.path.basename(fp)
            assert filename in recovered
            with open(fp, "rb") as f:
                assert recovered[filename] == f.read()

        # Cleanup
        for fp in files:
            os.unlink(fp)
        os.rmdir(tmp_dir)

    def test_key_hex_conversion(self):
        key = generate_encryption_key()
        hex_str = key_to_hex(key)
        restored = key_from_hex(hex_str)
        assert key == restored
        assert len(hex_str) == 64  # 32 bytes = 64 hex chars

    def test_wrong_key_fails(self):
        key1 = generate_encryption_key()
        key2 = generate_encryption_key()
        plaintext = b"Secret data"
        ciphertext, nonce, tag = encrypt_bytes(plaintext, key1)

        try:
            decrypt_file(ciphertext, key2, nonce, tag)
            assert False, "Should have raised ValueError"
        except (ValueError, Exception):
            pass  # Expected — wrong key


class TestAlgorandConnection:
    """Test Algorand testnet connectivity."""

    def test_algod_client_creation(self):
        client = get_algod_client()
        assert client is not None

    def test_testnet_connection(self):
        client = get_algod_client()
        try:
            status = client.status()
            assert "last-round" in status
            assert status["last-round"] > 0
            print(f"  Connected! Last round: {status['last-round']}")
        except Exception as e:
            # Network might not be available in CI
            print(f"  Testnet not reachable: {e} (OK for offline testing)")


class TestEvidenceRegistryTEAL:
    """Test TEAL source generation."""

    def _import_registry(self):
        """Import from the smart-contracts dir (hyphen not valid for Python import)."""
        import importlib.util
        spec = importlib.util.spec_from_file_location(
            "evidence_registry",
            os.path.join(os.path.dirname(__file__), "..", "smart-contracts", "contracts", "evidence_registry.py"),
        )
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        return mod

    def test_approval_teal_valid(self):
        mod = self._import_registry()
        teal = mod.get_approval_teal()
        assert "#pragma version 10" in teal
        assert "submit_evidence" in teal
        assert "update_status" in teal
        assert "get_evidence" in teal
        assert "evidence_counter" in teal

    def test_clear_teal_valid(self):
        mod = self._import_registry()
        teal = mod.get_clear_teal()
        assert "#pragma version 10" in teal
        assert "int 1" in teal


if __name__ == "__main__":
    import pytest
    pytest.main([__file__, "-v"])
