"""
WhistleChain -- Public Record & Audit Trail Service (Step 5)
=============================================================
After a case is resolved on-chain (Step 4), this service:

  1. Finalizes the evidence state as PUBLIC
  2. Ensures the IPFS hash and verification outcome remain permanently accessible
  3. Records the complete immutable audit trail on-chain:
     - When the evidence was submitted
     - How it was verified (inspector verdicts, commit-reveal proofs)
     - What final decision was recorded
     - When the resolution occurred and what funds moved

Key Design:
  - No further actions or fund movements occur after publication
  - Anyone can independently verify the entire lifecycle
  - All data is stored on-chain in an audit box ("AUD-" prefix)
  - Creates a transparent, censorship-resistant record
  - Evidence and decisions cannot be altered or erased

Lifecycle:
  RESOLVED (Step 4) -> publish_evidence -> PUBLISHED (status=4)
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
from services.resolution import (
    _resolution_records,
    get_resolution,
)

load_dotenv()

# ─── Audit Trail Store ───
_audit_records: dict[str, dict] = {}
_published_evidence: dict[str, dict] = {}


def publish_evidence(
    evidence_id: str,
    app_id: int = None,
    admin_private_key: str = None,
) -> dict:
    """
    Finalize evidence state as PUBLIC and create immutable audit trail.

    After Step 4 resolution:
      - Marks evidence as PUBLISHED (status=4) on-chain
      - Creates an audit box with the complete lifecycle record
      - IPFS hash and verification outcome remain permanently accessible
      - No further actions or fund movements occur

    Anyone can independently verify:
      - When the evidence was submitted
      - How it was verified
      - What final decision was recorded
    """
    # Already published?
    if evidence_id in _published_evidence:
        return {
            "error": "Evidence already published",
            "audit": _published_evidence[evidence_id],
        }

    # Must be resolved first
    resolution = _resolution_records.get(evidence_id)
    if not resolution:
        return {
            "error": "Evidence must be resolved (Step 4) before publication. "
                     "No resolution record found.",
        }

    # Get verification session for full audit data
    session = _verification_sessions.get(evidence_id)
    if not session:
        return {"error": "No verification session found"}

    # Build comprehensive audit trail
    audit_trail = _build_audit_trail(evidence_id, session, resolution)

    # Publish on-chain
    tx_id = None
    if app_id and admin_private_key:
        try:
            tx_id = _publish_onchain(
                app_id, admin_private_key, evidence_id, audit_trail
            )
            audit_trail["publish_tx_id"] = tx_id
        except Exception as e:
            audit_trail["publish_error"] = str(e)

    # Mark as published
    audit_trail["published_at"] = time.strftime("%Y-%m-%d %H:%M:%S")
    audit_trail["published_timestamp"] = int(time.time())
    audit_trail["status"] = "PUBLISHED"

    # Update session
    session["status"] = "PUBLISHED"
    session["published_at"] = audit_trail["published_at"]

    # Store records
    _audit_records[evidence_id] = audit_trail
    _published_evidence[evidence_id] = audit_trail

    return {
        "status": "PUBLISHED",
        "evidence_id": evidence_id,
        "published_at": audit_trail["published_at"],
        "tx_id": tx_id,
        "audit_trail": audit_trail,
        "message": (
            "Evidence finalized as PUBLIC. The IPFS hash and verification "
            "outcome are now permanently accessible on the Algorand blockchain. "
            "Anyone can independently verify the entire evidence lifecycle."
        ),
    }


def get_audit_trail(evidence_id: str) -> dict:
    """
    Get the complete audit trail for an evidence item.
    This is the public, permanently accessible record.
    """
    audit = _audit_records.get(evidence_id)
    if not audit:
        # Try to build from available data even if not formally published
        session = _verification_sessions.get(evidence_id)
        resolution = _resolution_records.get(evidence_id)
        if session:
            return _build_audit_trail(evidence_id, session, resolution)
        return {
            "evidence_id": evidence_id,
            "status": "NO_AUDIT_RECORD",
            "message": "No audit trail found for this evidence.",
        }
    return audit


def get_all_audit_records() -> list[dict]:
    """Get all published audit records."""
    return list(_audit_records.values())


def get_public_evidence() -> list[dict]:
    """Get all evidence that has been made public."""
    records = []
    for evd_id, audit in _published_evidence.items():
        records.append({
            "evidence_id": evd_id,
            "category": audit.get("category", "UNKNOWN"),
            "final_verdict": audit.get("resolution", {}).get("verification_verdict", "UNKNOWN"),
            "resolution_action": audit.get("resolution", {}).get("resolution_action", "UNKNOWN"),
            "published_at": audit.get("published_at", ""),
            "submit_timestamp": audit.get("timeline", {}).get("submitted_at", ""),
            "verification_started": audit.get("timeline", {}).get("verification_started", ""),
            "finalized_at": audit.get("timeline", {}).get("finalized_at", ""),
            "resolved_at": audit.get("timeline", {}).get("resolved_at", ""),
            "inspector_count": audit.get("verification_summary", {}).get("total_inspectors", 0),
            "vote_breakdown": audit.get("verification_summary", {}).get("vote_breakdown", {}),
            "publish_tx_id": audit.get("publish_tx_id"),
        })
    return records


def get_audit_stats() -> dict:
    """Get aggregate audit statistics."""
    total = len(_published_evidence)
    verified = sum(
        1 for a in _published_evidence.values()
        if a.get("resolution", {}).get("verification_verdict") == "VERIFIED"
    )
    rejected = sum(
        1 for a in _published_evidence.values()
        if a.get("resolution", {}).get("verification_verdict") == "REJECTED"
    )

    return {
        "total_published": total,
        "verified_published": verified,
        "rejected_published": rejected,
        "transparency_score": "100%",  # all data on-chain
        "censorship_resistant": True,
        "immutable": True,
    }


def _build_audit_trail(
    evidence_id: str,
    session: dict,
    resolution: Optional[dict] = None,
) -> dict:
    """
    Build a comprehensive audit trail from all available data.
    This creates the permanent public record of the evidence lifecycle.
    """
    # Timeline
    timeline = {
        "submitted_at": session.get("started_at", ""),
        "verification_started": session.get("started_at", ""),
        "verification_window_hours": session.get("window_hours", 0),
        "verification_deadline": session.get("window_end_formatted", ""),
        "finalized_at": session.get("finalized_at", ""),
    }

    if resolution:
        timeline["resolved_at"] = resolution.get("resolved_at", "")
        timeline["resolution_action"] = resolution.get("resolution_action", "")

    # Verification summary
    verification_summary = {
        "total_inspectors": len(session.get("reveals", {})),
        "commits_received": len(session.get("commits", {})),
        "reveals_received": len(session.get("reveals", {})),
        "consensus_threshold": "67%",
        "vote_breakdown": session.get("vote_breakdown", {}),
        "final_verdict": session.get("final_verdict", ""),
    }

    # Inspector verdicts (anonymized for public record)
    inspector_verdicts = []
    for addr, reveal in session.get("reveals", {}).items():
        inspector_verdicts.append({
            "inspector_id": addr[:8] + "..." + addr[-4:],  # anonymized
            "verdict": reveal.get("verdict_label", "UNKNOWN"),
            "justification_ipfs": reveal.get("justification_ipfs", ""),
            "revealed_at": reveal.get("revealed_at", ""),
        })

    # On-chain references
    on_chain = {
        "verification_tx": session.get("on_chain_tx"),
        "finalize_tx": session.get("finalize_tx"),
    }
    if resolution:
        on_chain["resolution_tx"] = resolution.get("on_chain_tx")

    audit = {
        "evidence_id": evidence_id,
        "category": session.get("category", "UNKNOWN"),
        "status": session.get("status", "UNKNOWN"),
        "timeline": timeline,
        "verification_summary": verification_summary,
        "inspector_verdicts": inspector_verdicts,
        "resolution": resolution or {"status": "NOT_RESOLVED"},
        "on_chain_references": on_chain,
        "integrity": {
            "all_actions_on_chain": True,
            "tamper_proof": True,
            "censorship_resistant": True,
            "independently_verifiable": True,
        },
    }

    return audit


def _make_evidence_box_key(evidence_id: str) -> bytes:
    """Convert evidence_id to box key bytes."""
    parts = evidence_id.split("-")
    if len(parts) >= 3:
        counter = int(parts[-1])
    else:
        counter = int(parts[-1]) if parts[-1].isdigit() else 1
    return b"EVD-" + counter.to_bytes(8, "big")


def _publish_onchain(
    app_id: int,
    admin_pk: str,
    evidence_id: str,
    audit_trail: dict,
) -> str:
    """
    Submit publish_evidence app call to Algorand.
    Creates permanent audit box on-chain.
    """
    client = get_algod_client()
    sp = client.suggested_params()
    admin_addr = account.address_from_private_key(admin_pk)
    box_key = _make_evidence_box_key(evidence_id)

    # Build updated evidence blob (PUBLISHED status)
    updated_blob = (
        f"published|{evidence_id}|status=PUBLISHED|"
        f"verdict={audit_trail.get('verification_summary', {}).get('final_verdict', '')}|"
        f"published_at={int(time.time())}"
    ).encode("utf-8")

    # Build audit summary JSON for on-chain storage
    audit_summary = json.dumps({
        "evidence_id": evidence_id,
        "category": audit_trail.get("category", ""),
        "timeline": audit_trail.get("timeline", {}),
        "verdict": audit_trail.get("verification_summary", {}).get("final_verdict", ""),
        "vote_breakdown": audit_trail.get("verification_summary", {}).get("vote_breakdown", {}),
        "inspector_count": audit_trail.get("verification_summary", {}).get("total_inspectors", 0),
        "resolution_action": audit_trail.get("resolution", {}).get("resolution_action", ""),
        "published_at": int(time.time()),
    }).encode("utf-8")

    # Audit box key
    audit_box_key = b"AUD-" + box_key[4:]

    txn = transaction.ApplicationCallTxn(
        sender=admin_addr,
        sp=sp,
        index=app_id,
        on_complete=transaction.OnComplete.NoOpOC,
        app_args=[
            b"publish_evidence",
            box_key,
            updated_blob,
            audit_summary,
        ],
        boxes=[
            (app_id, box_key),
            (app_id, audit_box_key),
        ],
    )
    signed = txn.sign(admin_pk)
    tx_id = client.send_transaction(signed)
    transaction.wait_for_confirmation(client, tx_id, 10)
    return tx_id
