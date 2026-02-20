"""
WhistleChain -- Evidence Submission Pipeline (Steps 1 & 2)
==========================================================
Complete end-to-end flow for submitting evidence with stake locking:

  1. Create anonymous wallet (or use existing)
  2. Encrypt evidence files with AES-256-GCM
  3. Upload encrypted bundle to IPFS via Pinata
  4. Calculate minimum stake for the evidence category
  5. Build grouped transactions: PaymentTxn (stake) + ApplicationCallTxn
  6. Stake is locked in the smart contract -- cannot be withdrawn
  7. Smart contract generates Evidence ID & timestamp
  8. Status = PENDING

This module ties together all WhistleChain components.
"""

import os
import sys
import json
import time
import base64
import hashlib

# Add project root to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from algosdk import transaction, account, mnemonic, encoding
from algosdk.v2client import algod
from dotenv import load_dotenv

from services.encryption import (
    generate_encryption_key,
    encrypt_files_to_bundle,
    key_to_hex,
)
from services.ipfs_upload import upload_bytes_to_ipfs, get_ipfs_url
from services.wallet import create_anonymous_wallet, wallet_from_mnemonic
from services.algorand_client import get_algod_client

load_dotenv()

# --- Evidence Categories ---
CATEGORIES = {
    "FINANCIAL": 0,
    "CONSTRUCTION": 1,
    "FOOD": 2,
    "ACADEMIC": 3,
}

# --- Minimum stakes per category (microAlgos) ---
MIN_STAKE_MICROALGOS = {
    "FINANCIAL": 25_000_000,      # 25 ALGO
    "CONSTRUCTION": 50_000_000,   # 50 ALGO
    "FOOD": 25_000_000,           # 25 ALGO
    "ACADEMIC": 15_000_000,       # 15 ALGO
}

MAX_STAKE_MICROALGOS = 500_000_000  # 500 ALGO

# --- Evidence Statuses ---
STATUS_PENDING = 0
STATUS_VERIFIED = 1
STATUS_DISPUTED = 2
STATUS_REJECTED = 3
STATUS_PUBLISHED = 4


def get_application_address(app_id: int) -> str:
    """Compute the Algorand application account address."""
    addr_bytes = hashlib.new(
        "sha512_256", b"appID" + app_id.to_bytes(8, "big")
    ).digest()
    return encoding.encode_address(addr_bytes)


def validate_stake_amount(category: str, stake_microalgos: int) -> None:
    """
    Validate the stake amount meets category minimum and doesn't exceed max.
    Raises ValueError if invalid.
    """
    cat = category.upper()
    min_stake = MIN_STAKE_MICROALGOS.get(cat, 15_000_000)
    if stake_microalgos < min_stake:
        min_algo = min_stake / 1_000_000
        provided_algo = stake_microalgos / 1_000_000
        raise ValueError(
            f"Stake too low for {cat}: {provided_algo} ALGO provided, "
            f"minimum is {min_algo} ALGO"
        )
    if stake_microalgos > MAX_STAKE_MICROALGOS:
        raise ValueError(
            f"Stake exceeds maximum: {stake_microalgos / 1_000_000} ALGO "
            f"(max {MAX_STAKE_MICROALGOS / 1_000_000} ALGO)"
        )


def submit_evidence(
    file_paths: list[str],
    category: str,
    organization: str,
    description: str,
    stake_amount_microalgos: int = 0,
    wallet_mnemonic: str | None = None,
    app_id: int | None = None,
) -> dict:
    """
    Complete evidence submission pipeline with stake locking.

    Args:
        file_paths: List of evidence file paths to encrypt & upload.
        category: One of FINANCIAL, CONSTRUCTION, FOOD, ACADEMIC.
        organization: Name of the accused entity.
        description: Free-text description of the fraud/violation.
        stake_amount_microalgos: Stake in microAlgos (1 ALGO = 1,000,000).
            Must meet minimum for the category. If 0, uses category minimum.
        wallet_mnemonic: Optional 25-word mnemonic. If None, creates new wallet.
        app_id: Evidence Registry contract App ID. Reads from env if None.

    Returns:
        {
            "evidence_id": "EVD-2026-00001",
            "ipfs_hash": "QmXyz...",
            "ipfs_url": "https://ipfs.io/ipfs/QmXyz...",
            "tx_id": "TXID...",
            "block": 12345678,
            "timestamp": 1708345200,
            "status": "PENDING",
            "wallet_address": "ALGO...",
            "encryption_key_hex": "abc123...",
            "category": "FINANCIAL",
            "organization": "...",
            "stake_amount": 25000000,
            "stake_locked": True,
        }
    """
    result = {}

    # Validate category early
    cat_upper = category.upper()
    if cat_upper not in CATEGORIES:
        raise ValueError(f"Invalid category: {category}. Use one of {list(CATEGORIES.keys())}")

    # -- STEP 1: Wallet -----------------------------------------------
    print("\n[lock] Step 1: Setting up anonymous wallet...")
    if wallet_mnemonic:
        wallet = wallet_from_mnemonic(wallet_mnemonic)
        print(f"   Using existing wallet: {wallet['address']}")
    else:
        wallet = create_anonymous_wallet()
        print(f"   New anonymous wallet created!")
        print(f"   Address : {wallet['address']}")
        print(f"   SAVE YOUR MNEMONIC (shown only once):")
        print(f"   {wallet['mnemonic']}")

    result["wallet_address"] = wallet["address"]
    result["wallet_mnemonic"] = wallet["mnemonic"]

    # -- STEP 2: Validate & compute stake ------------------------------
    print("\n[coins] Step 2: Computing stake amount...")
    min_stake = MIN_STAKE_MICROALGOS.get(cat_upper, 15_000_000)
    if stake_amount_microalgos <= 0:
        stake_amount_microalgos = min_stake
        print(f"   Using default stake for {cat_upper}: {min_stake / 1_000_000:.0f} ALGO")
    else:
        validate_stake_amount(cat_upper, stake_amount_microalgos)
        print(f"   Stake: {stake_amount_microalgos / 1_000_000:.0f} ALGO (min: {min_stake / 1_000_000:.0f})")

    result["stake_amount"] = stake_amount_microalgos
    result["stake_locked"] = True

    # -- STEP 3: Encrypt Evidence --------------------------------------
    print("\n[lock] Step 3: Encrypting evidence files with AES-256-GCM...")
    encryption_key = generate_encryption_key()
    result["encryption_key_hex"] = key_to_hex(encryption_key)

    for fp in file_paths:
        if not os.path.exists(fp):
            raise FileNotFoundError(f"Evidence file not found: {fp}")
        size_kb = os.path.getsize(fp) / 1024
        print(f"   {os.path.basename(fp)} ({size_kb:.1f} KB)")

    encrypted_bundle = encrypt_files_to_bundle(file_paths, encryption_key)
    print(f"   Encrypted bundle: {len(encrypted_bundle)} bytes")
    print(f"   Encryption key (SAVE THIS): {result['encryption_key_hex']}")

    # -- STEP 4: Upload to IPFS ----------------------------------------
    print("\n[upload] Step 4: Uploading encrypted evidence to IPFS...")
    ipfs_result = upload_bytes_to_ipfs(
        encrypted_bundle,
        filename=f"whistlechain_evidence_{int(time.time())}.json",
    )

    ipfs_hash = ipfs_result["IpfsHash"]
    result["ipfs_hash"] = ipfs_hash
    result["ipfs_url"] = get_ipfs_url(ipfs_hash)
    result["ipfs_pin_size"] = ipfs_result.get("PinSize", 0)

    print(f"   Uploaded to IPFS!")
    print(f"   IPFS Hash : {ipfs_hash}")
    print(f"   URL       : {result['ipfs_url']}")

    # -- STEP 5: Record on Algorand Blockchain -------------------------
    print("\n[chain] Step 5: Anchoring evidence + locking stake on Algorand...")

    # Get App ID
    if app_id is None:
        app_id_str = os.getenv("EVIDENCE_REGISTRY_APP_ID", "")
        if not app_id_str:
            ids_path = os.path.join(
                os.path.dirname(__file__), "..", "smart-contracts", "deploy", "contract_ids.json"
            )
            if os.path.exists(ids_path):
                with open(ids_path) as f:
                    ids = json.load(f)
                app_id = ids.get("evidence_registry", {}).get("app_id")

        if app_id_str and app_id is None:
            app_id = int(app_id_str)

    if not app_id:
        raise ValueError(
            "EVIDENCE_REGISTRY_APP_ID not set. Deploy the contract first."
        )

    client = get_algod_client()
    sp = client.suggested_params()

    # Compute application address for stake payment
    app_address = get_application_address(app_id)
    print(f"   Contract App ID  : {app_id}")
    print(f"   Contract Address : {app_address}")
    print(f"   Stake to lock    : {stake_amount_microalgos / 1_000_000:.0f} ALGO")

    # Build application call transaction
    app_call_txn = transaction.ApplicationCallTxn(
        sender=wallet["address"],
        sp=sp,
        index=app_id,
        on_complete=transaction.OnComplete.NoOpOC,
        app_args=[
            b"submit_evidence",
            ipfs_hash.encode("utf-8"),
            cat_upper.encode("utf-8"),
            organization.encode("utf-8")[:64],
            description.encode("utf-8")[:128],
            str(stake_amount_microalgos).encode("utf-8"),
        ],
        boxes=[
            (app_id, b"EVD-" + b"\x00" * 8),  # placeholder box ref
        ],
    )

    if stake_amount_microalgos > 0:
        # Staked tier: grouped PaymentTxn + AppCallTxn
        pay_txn = transaction.PaymentTxn(
            sender=wallet["address"],
            sp=sp,
            receiver=app_address,
            amt=stake_amount_microalgos,
        )

        # Group the transactions: [Payment, AppCall]
        gid = transaction.calculate_group_id([pay_txn, app_call_txn])
        pay_txn.group = gid
        app_call_txn.group = gid

        signed_pay = pay_txn.sign(wallet["private_key"])
        signed_app = app_call_txn.sign(wallet["private_key"])

        tx_id = client.send_transactions([signed_pay, signed_app])
        print(f"   Transaction sent: {tx_id}")
        print(f"   Stake locked in contract account (non-withdrawable)")
    else:
        # Free tier: just the AppCall, no payment
        signed_app = app_call_txn.sign(wallet["private_key"])
        tx_id = client.send_transaction(signed_app)
        print(f"   Transaction sent: {tx_id}")
        print(f"   Free-tier submission (no stake locked)")

    # Wait for confirmation
    confirmed = transaction.wait_for_confirmation(client, tx_id, 10)

    result["tx_id"] = tx_id
    result["block"] = confirmed["confirmed-round"]
    result["timestamp"] = int(time.time())

    # Parse evidence ID from logs
    evidence_counter = 1
    if "logs" in confirmed:
        for log_entry in confirmed["logs"]:
            decoded = base64.b64decode(log_entry)
            if decoded.startswith(b"evidence_id:"):
                counter_bytes = decoded[len(b"evidence_id:"):]
                evidence_counter = int.from_bytes(counter_bytes, "big")

    year = time.strftime("%Y")
    evidence_id = f"EVD-{year}-{evidence_counter:05d}"
    result["evidence_id"] = evidence_id
    result["status"] = "PENDING"
    result["category"] = cat_upper
    result["organization"] = organization
    result["description"] = description

    # -- Summary -------------------------------------------------------
    tier_label = "STAKED" if stake_amount_microalgos > 0 else "FREE"
    print("\n" + "=" * 56)
    print(f"  EVIDENCE SUBMITTED ({tier_label} TIER)")
    print("=" * 56)
    print(f"  Evidence ID    : {evidence_id}")
    print(f"  IPFS Hash      : {ipfs_hash}")
    print(f"  IPFS URL       : {result['ipfs_url']}")
    print(f"  Transaction    : {tx_id}")
    print(f"  Block          : #{result['block']}")
    print(f"  Timestamp      : {time.strftime('%d %b %Y %H:%M IST')}")
    print(f"  Status         : PENDING")
    print(f"  Category       : {cat_upper}")
    print(f"  Organization   : {organization}")
    print(f"  Stake Locked   : {stake_amount_microalgos / 1_000_000:.0f} ALGO")
    print("---")
    print(f"  Your identity is never stored anywhere.")
    print(f"  Encryption key: {result['encryption_key_hex']}")
    print(f"  Wallet: {wallet['address']}")
    print(f"  Stake outcome: returned if verified, forfeited if fake.")
    print("=" * 56)

    return result


def submit_evidence_simple(
    file_paths: list[str],
    category: str,
    organization: str,
    description: str,
    wallet_mnemonic: str | None = None,
) -> dict:
    """
    Simplified evidence submission (uses category default stake, reads app_id from env).
    """
    cat_upper = category.upper()
    default_stake = MIN_STAKE_MICROALGOS.get(cat_upper, 15_000_000)
    return submit_evidence(
        file_paths=file_paths,
        category=category,
        organization=organization,
        description=description,
        stake_amount_microalgos=default_stake,
        wallet_mnemonic=wallet_mnemonic,
    )
