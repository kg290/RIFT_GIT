"""
WhistleChain -- Stake Management Service (Step 2)
==================================================
Handles stake locking, refunding, and forfeiture for evidence submissions.

Stake Lifecycle:
  1. LOCKED   -- stake sent to contract on evidence submission
  2. REFUNDED -- admin returns stake when evidence is verified or insufficient
  3. FORFEITED -- admin seizes stake when evidence is proven fake/malicious

Only the contract admin (deployer) can trigger refund or forfeit.
The whistleblower CANNOT withdraw their stake -- it is locked by the smart contract.
"""

import os
import sys
import json
import hashlib

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from algosdk import transaction, encoding
from dotenv import load_dotenv

from services.algorand_client import get_algod_client

load_dotenv()

# Minimum stakes per category (microAlgos)
MIN_STAKE_MICROALGOS = {
    "FINANCIAL": 25_000_000,
    "CONSTRUCTION": 50_000_000,
    "FOOD": 25_000_000,
    "ACADEMIC": 15_000_000,
}

MAX_STAKE_MICROALGOS = 500_000_000


def get_application_address(app_id: int) -> str:
    """Compute the Algorand application account address."""
    addr_bytes = hashlib.new(
        "sha512_256", b"appID" + app_id.to_bytes(8, "big")
    ).digest()
    return encoding.encode_address(addr_bytes)


def get_stake_info(category: str) -> dict:
    """Get stake requirements for a category."""
    cat = category.upper()
    min_stake = MIN_STAKE_MICROALGOS.get(cat, 15_000_000)
    return {
        "category": cat,
        "min_stake_microalgos": min_stake,
        "min_stake_algo": min_stake / 1_000_000,
        "max_stake_microalgos": MAX_STAKE_MICROALGOS,
        "max_stake_algo": MAX_STAKE_MICROALGOS / 1_000_000,
    }


def refund_stake(
    app_id: int,
    admin_private_key: str,
    box_key: bytes,
    submitter_address: str,
    refund_amount_microalgos: int,
) -> dict:
    """
    Admin refunds stake to the original submitter.
    Called when evidence is verified or deemed insufficient.

    Args:
        app_id: Evidence Registry App ID.
        admin_private_key: Admin's private key (deployer).
        box_key: Box key of the evidence (e.g. b"EVD-" + counter_bytes).
        submitter_address: Algorand address of the whistleblower to refund.
        refund_amount_microalgos: Amount to refund in microAlgos.

    Returns:
        {"tx_id": "...", "status": "refunded", "amount": ...}
    """
    client = get_algod_client()
    sp = client.suggested_params()
    sp.flat_fee = True
    sp.fee = 2000  # cover inner txn fee

    from algosdk import account
    admin_address = account.address_from_private_key(admin_private_key)

    txn = transaction.ApplicationCallTxn(
        sender=admin_address,
        sp=sp,
        index=app_id,
        on_complete=transaction.OnComplete.NoOpOC,
        app_args=[
            b"refund_stake",
            box_key,
            refund_amount_microalgos.to_bytes(8, "big"),
            encoding.decode_address(submitter_address),
        ],
        boxes=[(app_id, box_key)],
    )

    signed = txn.sign(admin_private_key)
    tx_id = client.send_transaction(signed)
    confirmed = transaction.wait_for_confirmation(client, tx_id, 10)

    return {
        "tx_id": tx_id,
        "block": confirmed["confirmed-round"],
        "status": "refunded",
        "amount_microalgos": refund_amount_microalgos,
        "amount_algo": refund_amount_microalgos / 1_000_000,
        "recipient": submitter_address,
    }


def forfeit_stake(
    app_id: int,
    admin_private_key: str,
    box_key: bytes,
    forfeit_amount_microalgos: int,
) -> dict:
    """
    Admin forfeits stake (evidence proven fake/malicious).
    Funds remain in the contract account as treasury.

    Args:
        app_id: Evidence Registry App ID.
        admin_private_key: Admin's private key (deployer).
        box_key: Box key of the evidence.
        forfeit_amount_microalgos: Amount to forfeit in microAlgos.

    Returns:
        {"tx_id": "...", "status": "forfeited", "amount": ...}
    """
    client = get_algod_client()
    sp = client.suggested_params()

    from algosdk import account
    admin_address = account.address_from_private_key(admin_private_key)

    txn = transaction.ApplicationCallTxn(
        sender=admin_address,
        sp=sp,
        index=app_id,
        on_complete=transaction.OnComplete.NoOpOC,
        app_args=[
            b"forfeit_stake",
            box_key,
            forfeit_amount_microalgos.to_bytes(8, "big"),
        ],
        boxes=[(app_id, box_key)],
    )

    signed = txn.sign(admin_private_key)
    tx_id = client.send_transaction(signed)
    confirmed = transaction.wait_for_confirmation(client, tx_id, 10)

    return {
        "tx_id": tx_id,
        "block": confirmed["confirmed-round"],
        "status": "forfeited",
        "amount_microalgos": forfeit_amount_microalgos,
        "amount_algo": forfeit_amount_microalgos / 1_000_000,
    }


def check_contract_balance(app_id: int) -> dict:
    """Check the contract's ALGO balance (total locked stakes)."""
    client = get_algod_client()
    app_address = get_application_address(app_id)
    try:
        info = client.account_info(app_address)
        balance = info.get("amount", 0)
        return {
            "app_id": app_id,
            "app_address": app_address,
            "balance_microalgos": balance,
            "balance_algo": balance / 1_000_000,
        }
    except Exception as e:
        return {
            "app_id": app_id,
            "app_address": app_address,
            "error": str(e),
        }
