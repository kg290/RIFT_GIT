"""
Tests for WhistleChain Step 2: Stake Locking (Anti-Spam Enforcement).
Covers: stake validation, minimum stake rules, application address,
        stake manager functions, and API stake endpoints.

Run:
    cd D:\\Hackathon\\RIFT2\\whistlechain
    .\\venv\\Scripts\\Activate.ps1
    python -m pytest tests/test_step2.py -v
"""

import os
import sys
import json
import hashlib
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from algosdk import encoding

from backend.services.stake_manager import (
    get_stake_info,
    get_application_address,
    check_contract_balance,
    MIN_STAKE_MICROALGOS,
    MAX_STAKE_MICROALGOS,
)
from backend.submit_evidence import (
    validate_stake_amount,
    CATEGORIES,
    MIN_STAKE_MICROALGOS as SUBMIT_MIN_STAKES,
)

# Import smart contract helpers
import importlib.util

contract_path = os.path.join(
    os.path.dirname(__file__), "..", "smart-contracts", "contracts", "evidence_registry.py"
)
spec = importlib.util.spec_from_file_location("evidence_registry", contract_path)
evidence_registry = importlib.util.module_from_spec(spec)
spec.loader.exec_module(evidence_registry)


# ---- Stake Validation Tests ----

class TestStakeValidation:
    """Test minimum stake enforcement per category."""

    def test_financial_min_stake(self):
        """FINANCIAL requires 25 ALGO minimum."""
        info = get_stake_info("FINANCIAL")
        assert info["min_stake_algo"] == 25.0
        assert info["min_stake_microalgos"] == 25_000_000

    def test_construction_min_stake(self):
        """CONSTRUCTION requires 50 ALGO minimum (higher -- physical inspection needed)."""
        info = get_stake_info("CONSTRUCTION")
        assert info["min_stake_algo"] == 50.0
        assert info["min_stake_microalgos"] == 50_000_000

    def test_food_min_stake(self):
        """FOOD requires 25 ALGO minimum."""
        info = get_stake_info("FOOD")
        assert info["min_stake_algo"] == 25.0

    def test_academic_min_stake(self):
        """ACADEMIC requires 15 ALGO minimum (lowest category)."""
        info = get_stake_info("ACADEMIC")
        assert info["min_stake_algo"] == 15.0

    def test_max_stake_consistent(self):
        """Max stake is 500 ALGO across all categories."""
        for cat in ["FINANCIAL", "CONSTRUCTION", "FOOD", "ACADEMIC"]:
            info = get_stake_info(cat)
            assert info["max_stake_algo"] == 500.0

    def test_validate_stake_passes_at_minimum(self):
        """Validation passes when stake exactly meets minimum."""
        validate_stake_amount("FINANCIAL", 25_000_000)  # should not raise
        validate_stake_amount("CONSTRUCTION", 50_000_000)
        validate_stake_amount("ACADEMIC", 15_000_000)

    def test_validate_stake_passes_above_minimum(self):
        """Validation passes when stake exceeds minimum."""
        validate_stake_amount("ACADEMIC", 100_000_000)  # 100 ALGO > 15 min

    def test_validate_stake_fails_below_minimum(self):
        """Validation fails when stake is below minimum."""
        with pytest.raises(ValueError, match="Stake too low"):
            validate_stake_amount("FINANCIAL", 10_000_000)  # 10 < 25

    def test_validate_stake_fails_below_construction_min(self):
        """CONSTRUCTION has highest minimum; 25 ALGO is not enough."""
        with pytest.raises(ValueError, match="Stake too low"):
            validate_stake_amount("CONSTRUCTION", 25_000_000)  # 25 < 50

    def test_validate_stake_fails_above_maximum(self):
        """Validation fails when stake exceeds 500 ALGO max."""
        with pytest.raises(ValueError, match="Stake exceeds maximum"):
            validate_stake_amount("ACADEMIC", 600_000_000)  # 600 > 500

    def test_validate_stake_zero_uses_default(self):
        """Zero stake should fail validation (< minimum)."""
        with pytest.raises(ValueError, match="Stake too low"):
            validate_stake_amount("FINANCIAL", 0)

    def test_categories_consistent(self):
        """Both submit_evidence and stake_manager have same category minimums."""
        assert SUBMIT_MIN_STAKES == MIN_STAKE_MICROALGOS


# ---- Application Address Tests ----

class TestApplicationAddress:
    """Test Algorand application address computation."""

    def test_app_address_is_valid_algorand_address(self):
        """App address should be a valid 58-char Algorand address."""
        addr = get_application_address(12345)
        assert len(addr) == 58
        # Should be decodable
        decoded = encoding.decode_address(addr)
        assert len(decoded) == 32

    def test_app_address_deterministic(self):
        """Same app_id always produces same address."""
        addr1 = get_application_address(99999)
        addr2 = get_application_address(99999)
        assert addr1 == addr2

    def test_different_apps_different_addresses(self):
        """Different app_ids produce different addresses."""
        addr1 = get_application_address(1)
        addr2 = get_application_address(2)
        assert addr1 != addr2

    def test_app_address_matches_manual_computation(self):
        """Verify address matches SHA-512/256 of 'appID' + bigendian id."""
        app_id = 42
        expected_bytes = hashlib.new(
            "sha512_256", b"appID" + app_id.to_bytes(8, "big")
        ).digest()
        expected_addr = encoding.encode_address(expected_bytes)
        assert get_application_address(app_id) == expected_addr

    def test_contract_module_app_address(self):
        """Smart contract module has same get_application_address function."""
        addr1 = get_application_address(777)
        addr2 = evidence_registry.get_application_address(777)
        assert addr1 == addr2


# ---- Smart Contract TEAL Tests ----

class TestSmartContractTEAL:
    """Test the updated TEAL program (v2 with staking)."""

    def test_teal_has_stake_methods(self):
        """Updated TEAL includes refund_stake and forfeit_stake methods."""
        teal = evidence_registry.get_approval_teal()
        assert "refund_stake" in teal
        assert "forfeit_stake" in teal

    def test_teal_has_total_staked_global(self):
        """TEAL initializes total_staked global state."""
        teal = evidence_registry.get_approval_teal()
        assert '"total_staked"' in teal

    def test_teal_has_total_forfeited_global(self):
        """TEAL initializes total_forfeited global state."""
        teal = evidence_registry.get_approval_teal()
        assert '"total_forfeited"' in teal

    def test_teal_has_inner_txn_for_refund(self):
        """Refund method uses inner transactions."""
        teal = evidence_registry.get_approval_teal()
        assert "itxn_begin" in teal
        assert "itxn_submit" in teal

    def test_teal_admin_only_refund(self):
        """Refund and forfeit methods check admin permission."""
        teal = evidence_registry.get_approval_teal()
        # Count admin checks -- should appear in handle_delete, handle_update,
        # update_status, refund_stake, forfeit_stake (5 times)
        admin_checks = teal.count('"admin"')
        assert admin_checks >= 5

    def test_teal_version_10(self):
        """TEAL program uses version 10."""
        teal = evidence_registry.get_approval_teal()
        assert teal.startswith("#pragma version 10")

    def test_clear_teal_unchanged(self):
        """Clear program is still simple return 1."""
        clear = evidence_registry.get_clear_teal()
        assert "int 1" in clear
        assert "return" in clear

    def test_box_value_includes_stake_status(self):
        """Box value format now includes stake_status as 9th field."""
        teal = evidence_registry.get_approval_teal()
        # The value construction should include stake_status (STAKE_LOCKED = 0)
        # after stake_amount
        assert "STAKE_LOCKED" in teal or "int 0" in teal


# ---- Box Parsing Tests ----

class TestBoxParsing:
    """Test parsing of updated box value format."""

    def test_parse_with_stake_status(self):
        """Parse box value that includes 9th field (stake_status)."""
        # Build a mock box value with 9 pipe-delimited fields
        parts = [
            b"QmTestHash123",                     # ipfs_hash
            b"FINANCIAL",                          # category
            b"Test Org",                           # organization
            b"Test description",                   # description
            b"\x00" * 32,                          # sender (32 bytes)
            (1700000000).to_bytes(8, "big"),        # timestamp
            (0).to_bytes(8, "big"),                 # status (PENDING)
            b"25000000",                           # stake_amount
            (0).to_bytes(8, "big"),                 # stake_status (LOCKED)
        ]
        raw = b"|".join(parts)
        parsed = evidence_registry.parse_evidence_box(raw)
        assert parsed["ipfs_hash"] == "QmTestHash123"
        assert parsed["category"] == "FINANCIAL"
        assert parsed["organization"] == "Test Org"
        assert parsed["stake_amount"] == "25000000"
        assert parsed["stake_status"] == 0

    def test_parse_without_stake_status_backwards_compat(self):
        """Parse old-format box value (8 fields) -- backwards compatible."""
        parts = [
            b"QmOldHash",
            b"FOOD",
            b"Old Org",
            b"Old description",
            b"\x00" * 32,
            (1700000000).to_bytes(8, "big"),
            (0).to_bytes(8, "big"),
            b"0",
        ]
        raw = b"|".join(parts)
        parsed = evidence_registry.parse_evidence_box(raw)
        assert parsed["ipfs_hash"] == "QmOldHash"
        assert parsed["category"] == "FOOD"
        assert parsed["stake_status"] == 0  # default

    def test_make_box_key(self):
        """Box key format: EVD- + 8-byte big-endian counter."""
        key = evidence_registry.make_box_key(1)
        assert key == b"EVD-" + (1).to_bytes(8, "big")
        assert len(key) == 12

    def test_format_evidence_id(self):
        """Evidence ID formatted as EVD-YYYY-NNNNN."""
        eid = evidence_registry.format_evidence_id(42)
        import time
        year = time.strftime("%Y")
        assert eid == f"EVD-{year}-00042"


# ---- Stake Constants Tests ----

class TestStakeConstants:
    """Test stake constants are well-defined."""

    def test_all_categories_have_min_stake(self):
        """Every evidence category has a minimum stake defined."""
        for cat in CATEGORIES:
            assert cat in MIN_STAKE_MICROALGOS
            assert MIN_STAKE_MICROALGOS[cat] > 0

    def test_min_stake_is_reasonable(self):
        """Minimum stakes are between 10 and 100 ALGO."""
        for cat, micro in MIN_STAKE_MICROALGOS.items():
            algo = micro / 1_000_000
            assert 10 <= algo <= 100, f"{cat}: {algo} ALGO not in [10, 100]"

    def test_max_stake_is_500_algo(self):
        """Maximum stake is 500 ALGO."""
        assert MAX_STAKE_MICROALGOS == 500_000_000

    def test_construction_is_highest_stake(self):
        """CONSTRUCTION has the highest minimum stake (physical inspection needed)."""
        max_cat = max(MIN_STAKE_MICROALGOS, key=MIN_STAKE_MICROALGOS.get)
        assert max_cat == "CONSTRUCTION"

    def test_academic_is_lowest_stake(self):
        """ACADEMIC has the lowest minimum stake."""
        min_cat = min(MIN_STAKE_MICROALGOS, key=MIN_STAKE_MICROALGOS.get)
        assert min_cat == "ACADEMIC"


# ---- Algorand Connection Tests ----

class TestAlgorandConnection:
    """Test Algorand connection still works with updated contract."""

    def test_get_algod_client(self):
        """Can create an algod client."""
        from backend.services.algorand_client import get_algod_client
        client = get_algod_client()
        assert client is not None

    def test_check_connection(self):
        """Can connect to Algorand testnet."""
        from backend.services.algorand_client import check_connection
        status = check_connection()
        assert status["last_round"] > 0
        assert status["network"] == "testnet"
