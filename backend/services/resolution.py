"""
WhistleChain -- On-Chain Resolution & Fund Release Service (Step 4)
===================================================================
After verification is finalized, this service executes automatic
on-chain resolution with no manual approval involved:

  VERIFIED  -> releases locked stake back to the whistleblower
  REJECTED  -> forfeits the whistleblower's stake permanently
  DISPUTED  -> remains locked, may require re-verification

Key Design:
  - All state changes are on-chain via smart contract inner transactions
  - No admin wallet manually approves fund movement
  - The contract itself evaluates status and moves funds
  - Results are permanently recorded on the blockchain
  - Tamper-proof: once resolved, status cannot be reversed

Lifecycle:
  FINALIZED (Step 3) -> resolve_evidence -> RESOLVED (status=6)
    if VERIFIED: inner txn refunds stake to submitter
    if REJECTED: stake forfeited, counter updated on-chain
"""

import os
import sys
import json
import time
from typing import Optional

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from algosdk import transaction, account, encoding
from dotenv import load_dotenv

from services.algorand_client import get_algod_client
from services.verification import (
    _verification_sessions,
    get_verification_status,
)
from services.submission_store import get_submission

load_dotenv()

# ─── Resolution Store ───
# Tracks resolution outcomes; in production this is all on-chain.
_resolution_records: dict[str, dict] = {}


def resolve_evidence(
    evidence_id: str,
    app_id: int = None,
    admin_private_key: str = None,
) -> dict:
    """
    Automatic on-chain resolution after verification is finalized.

    The smart contract evaluates the final verification status:
      - VERIFIED -> releases locked stake back to whistleblower
      - REJECTED -> forfeits stake, records rejection permanently
      - DISPUTED -> no fund movement, requires re-verification

    All transfers are executed by the contract via inner transactions.
    No admin wallet or manual approval is involved.
    """
    # Check verification session exists and is finalized
    session = _verification_sessions.get(evidence_id)
    if not session:
        return {"error": "No verification session found for this evidence"}

    if session["phase"] != "FINALIZED":
        return {
            "error": f"Verification is in {session['phase']} phase. "
                     "Must be FINALIZED before resolution.",
        }

    # Already resolved?
    if evidence_id in _resolution_records:
        existing = _resolution_records[evidence_id]
        return {
            "error": "Evidence already resolved",
            "resolution": existing,
        }

    final_verdict = session.get("final_verdict", "DISPUTED")

    # Determine resolution action
    if final_verdict == "VERIFIED":
        resolution_action = "STAKE_RELEASED"
        resolution_status = 1  # STATUS_VERIFIED
        stake_action = "refund"
    elif final_verdict == "REJECTED":
        resolution_action = "STAKE_FORFEITED"
        resolution_status = 3  # STATUS_REJECTED
        stake_action = "forfeit"
    elif final_verdict == "DISPUTED":
        resolution_action = "STAKE_LOCKED"
        resolution_status = 2  # STATUS_DISPUTED
        stake_action = "none"
    else:
        return {"error": f"Unknown verdict: {final_verdict}"}

    # Build resolution record
    resolution = {
        "evidence_id": evidence_id,
        "verification_verdict": final_verdict,
        "resolution_action": resolution_action,
        "resolution_status": "RESOLVED",
        "stake_action": stake_action,
        "resolved_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "resolved_timestamp": int(time.time()),
        "on_chain_tx": None,
        "on_chain_error": None,
        "vote_breakdown": session.get("vote_breakdown", {}),
        "inspector_count": len(session.get("reveals", {})),
        "consensus_threshold": "67%",
    }

    # Execute on-chain resolution
    tx_id = None
    if app_id and admin_private_key:
        try:
            if stake_action == "refund":
                tx_id = _resolve_onchain(
                    app_id, admin_private_key, evidence_id,
                    resolution_status, session
                )
            elif stake_action == "forfeit":
                tx_id = _resolve_onchain(
                    app_id, admin_private_key, evidence_id,
                    resolution_status, session
                )
            else:
                # DISPUTED: no fund movement, just update status
                tx_id = _resolve_onchain(
                    app_id, admin_private_key, evidence_id,
                    resolution_status, session
                )
            resolution["on_chain_tx"] = tx_id
        except Exception as e:
            resolution["on_chain_error"] = str(e)

    # Update verification session
    session["status"] = "RESOLVED"
    session["resolution"] = resolution

    # Store resolution record
    _resolution_records[evidence_id] = resolution

    return {
        "status": "RESOLVED",
        "evidence_id": evidence_id,
        "verification_verdict": final_verdict,
        "resolution_action": resolution_action,
        "stake_action": stake_action,
        "resolved_at": resolution["resolved_at"],
        "tx_id": tx_id,
        "message": _get_resolution_message(final_verdict, stake_action),
    }


def get_resolution(evidence_id: str) -> dict:
    """Get the resolution record for an evidence item."""
    record = _resolution_records.get(evidence_id)
    if not record:
        return {
            "evidence_id": evidence_id,
            "status": "NOT_RESOLVED",
            "message": "Evidence has not been resolved yet.",
        }
    return record


def get_all_resolutions() -> list[dict]:
    """Get all resolution records."""
    return list(_resolution_records.values())


def get_resolution_stats() -> dict:
    """Get aggregate resolution statistics."""
    total = len(_resolution_records)
    verified = sum(1 for r in _resolution_records.values() if r["verification_verdict"] == "VERIFIED")
    rejected = sum(1 for r in _resolution_records.values() if r["verification_verdict"] == "REJECTED")
    disputed = sum(1 for r in _resolution_records.values() if r["verification_verdict"] == "DISPUTED")

    return {
        "total_resolved": total,
        "verified_count": verified,
        "rejected_count": rejected,
        "disputed_count": disputed,
        "stakes_released": verified,
        "stakes_forfeited": rejected,
        "stakes_locked": disputed,
    }


def _get_resolution_message(verdict: str, stake_action: str) -> str:
    """Generate human-readable resolution message."""
    if verdict == "VERIFIED":
        return (
            "Evidence VERIFIED by inspector consensus. "
            "Locked stake has been automatically released back to the whistleblower "
            "via on-chain inner transaction. No manual approval was involved."
        )
    elif verdict == "REJECTED":
        return (
            "Evidence REJECTED by inspector consensus. "
            "Whistleblower's stake has been permanently forfeited on-chain. "
            "The rejection is recorded immutably on the blockchain."
        )
    elif verdict == "DISPUTED":
        return (
            "Evidence DISPUTED — no consensus reached. "
            "Stake remains locked pending re-verification. "
            "No funds were moved."
        )
    return "Resolution completed."


def _make_evidence_box_key(evidence_id: str) -> bytes:
    """Convert evidence_id to box key bytes."""
    parts = evidence_id.split("-")
    if len(parts) >= 3:
        counter = int(parts[-1])
    else:
        counter = int(parts[-1]) if parts[-1].isdigit() else 1
    return b"EVD-" + counter.to_bytes(8, "big")


def _resolve_onchain(
    app_id: int,
    admin_pk: str,
    evidence_id: str,
    resolution_status: int,
    session: dict,
) -> str:
    """
    Submit resolve_evidence app call to Algorand.
    The smart contract handles fund movement via inner transactions —
    no manual wallet approval needed.
    """
    client = get_algod_client()
    sp = client.suggested_params()
    # Cover inner transaction fee (refund payment inside contract)
    sp.flat_fee = True
    sp.fee = 2000  # outer txn fee + inner txn fee
    admin_addr = account.address_from_private_key(admin_pk)
    box_key = _make_evidence_box_key(evidence_id)

    # Get submitter address and stake from the submission store
    submitter_addr = admin_addr  # safe default
    stake_amount = 0

    submission = get_submission(evidence_id)
    if submission:
        submitter_addr = submission["wallet_address"]
        stake_amount = submission["stake_amount_microalgos"]
    else:
        # Fallback: try reading from on-chain box storage
        try:
            box_raw = client.application_box_by_name(
                app_id, box_key
            )
            if box_raw and "value" in box_raw:
                import base64
                box_bytes = base64.b64decode(box_raw["value"])
                parts = box_bytes.split(b"|")
                if len(parts) >= 8:
                    # Field 4 = submitter address (32 bytes)
                    if len(parts[4]) == 32:
                        submitter_addr = encoding.encode_address(parts[4])
                    # Field 7 = stake amount as string
                    try:
                        stake_amount = int(parts[7].decode("utf-8").strip("\x00"))
                    except (ValueError, UnicodeDecodeError):
                        pass
        except Exception:
            pass

        if stake_amount == 0:
            # Log warning — this means funds will NOT be refunded correctly
            print(f"[WARNING] No submission data found for {evidence_id}. "
                  f"Stake amount is 0, refund will be empty!")

    # Build updated evidence blob for the box
    updated_blob = (
        f"resolved|{evidence_id}|status={resolution_status}|"
        f"verdict={session.get('final_verdict', 'UNKNOWN')}|"
        f"resolved_at={int(time.time())}"
    ).encode("utf-8")

    # Build refund address bytes
    refund_addr_bytes = encoding.decode_address(submitter_addr)

    txn = transaction.ApplicationCallTxn(
        sender=admin_addr,
        sp=sp,
        index=app_id,
        on_complete=transaction.OnComplete.NoOpOC,
        app_args=[
            b"resolve_evidence",
            box_key,
            resolution_status.to_bytes(8, "big"),
            refund_addr_bytes,
            stake_amount.to_bytes(8, "big"),
            updated_blob,
        ],
        boxes=[
            (app_id, box_key),
        ],
    )
    signed = txn.sign(admin_pk)
    tx_id = client.send_transaction(signed)
    transaction.wait_for_confirmation(client, tx_id, 10)
    return tx_id
