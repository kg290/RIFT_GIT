"""
WhistleChain -- Submission Store
=================================
In-memory store that bridges evidence submission data to the resolution pipeline.

When evidence is submitted, the whistleblower's address, stake, track type,
and all metadata are stored here. This data is used by:
  - AI verification (auto-verify pipeline)
  - Bounty manager (payout calculation)
  - Publication bot (auto-publish)
  - Resolution (stake refund/forfeit)

In production, this data lives on-chain in box storage and can be read
directly from the smart contract. This module provides the off-chain bridge.
"""

import time
from typing import Optional

# Maps evidence_id -> { wallet_address, stake_amount_microalgos, category, ... }
_submission_records: dict[str, dict] = {}


def store_submission(
    evidence_id: str,
    wallet_address: str,
    stake_amount_microalgos: int,
    category: str = "",
    organization: str = "",
    description: str = "",
    tx_id: str = "",
    ipfs_hash: str = "",
    track: str = "",
    contract_id: str = "",
    claimed_amount: float = 0,
    approved_amount: float = 0,
    location: str = "",
    project: str = "",
    block: int = None,
) -> None:
    """Store submission data for later use during verification/resolution."""
    _submission_records[evidence_id] = {
        "evidence_id": evidence_id,
        "wallet_address": wallet_address,
        "stake_amount_microalgos": stake_amount_microalgos,
        "category": category,
        "organization": organization,
        "description": description,
        "tx_id": tx_id,
        "ipfs_hash": ipfs_hash,
        "track": track,
        "contract_id": contract_id,
        "claimed_amount": claimed_amount,
        "approved_amount": approved_amount,
        "location": location,
        "project": project,
        "block": block,
        "submitted_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "submitted_timestamp": int(time.time()),
        "status": "PENDING",
        "verification_result": None,
        "bounty_payout": None,
        "publication": None,
    }


def update_submission(evidence_id: str, **kwargs) -> Optional[dict]:
    """Update fields on an existing submission record."""
    record = _submission_records.get(evidence_id)
    if record:
        record.update(kwargs)
    return record


def get_submission(evidence_id: str) -> Optional[dict]:
    """Retrieve submission data by evidence ID."""
    return _submission_records.get(evidence_id)


def get_all_submissions() -> list[dict]:
    """Get all stored submission records."""
    return list(_submission_records.values())


def get_submissions_by_wallet(wallet_address: str) -> list[dict]:
    """Get all submissions from a specific wallet."""
    return [
        s for s in _submission_records.values()
        if s["wallet_address"] == wallet_address
    ]


def get_submissions_by_status(status: str) -> list[dict]:
    """Get all submissions with a specific status."""
    return [
        s for s in _submission_records.values()
        if s["status"] == status
    ]
