"""
WhistleChain -- Bounty Manager (User-Only Rewards)
====================================================
Handles bounty payouts exclusively for whistleblowers.

When evidence is VERIFIED:
  - Whistleblower receives: Stake Refund + Bounty Reward
  - No one else receives money (not inspectors, not admins)

When evidence is REJECTED:
  - Whistleblower loses their stake (forfeited)
  - No money distributed to anyone

When evidence is INSUFFICIENT:
  - Whistleblower gets stake refund only (no bounty)

Bounty amounts per category (in ALGO):
  FINANCIAL     : 200 ALGO bounty
  CONSTRUCTION  : 300 ALGO bounty
  FOOD          : 150 ALGO bounty
  ACADEMIC      : 100 ALGO bounty
"""

import time
from typing import Optional

# Bounty rewards per category (in microAlgos)
BOUNTY_REWARDS = {
    "FINANCIAL": 200_000_000,       # 200 ALGO
    "CONSTRUCTION": 300_000_000,    # 300 ALGO
    "FOOD": 150_000_000,            # 150 ALGO
    "ACADEMIC": 100_000_000,        # 100 ALGO
}

# In-memory bounty records
_bounty_payouts: dict[str, dict] = {}


def calculate_payout(
    category: str,
    stake_amount_microalgos: int,
    verdict: str,
) -> dict:
    """
    Calculate the payout for a whistleblower based on verdict.

    Returns:
        {
            "bounty_reward": int (microAlgos),
            "stake_refund": int (microAlgos),
            "total_payout": int (microAlgos),
            "payout_type": str,
        }
    """
    cat = category.upper()
    bounty = BOUNTY_REWARDS.get(cat, 100_000_000)

    if verdict == "VERIFIED":
        return {
            "bounty_reward": bounty,
            "stake_refund": stake_amount_microalgos,
            "total_payout": bounty + stake_amount_microalgos,
            "payout_type": "BOUNTY_PLUS_REFUND",
            "bounty_reward_algo": bounty / 1_000_000,
            "stake_refund_algo": stake_amount_microalgos / 1_000_000,
            "total_payout_algo": (bounty + stake_amount_microalgos) / 1_000_000,
        }
    elif verdict == "INSUFFICIENT":
        return {
            "bounty_reward": 0,
            "stake_refund": stake_amount_microalgos,
            "total_payout": stake_amount_microalgos,
            "payout_type": "STAKE_REFUND_ONLY",
            "bounty_reward_algo": 0,
            "stake_refund_algo": stake_amount_microalgos / 1_000_000,
            "total_payout_algo": stake_amount_microalgos / 1_000_000,
        }
    elif verdict == "REJECTED":
        return {
            "bounty_reward": 0,
            "stake_refund": 0,
            "total_payout": 0,
            "payout_type": "STAKE_FORFEITED",
            "bounty_reward_algo": 0,
            "stake_refund_algo": 0,
            "total_payout_algo": 0,
        }
    else:
        return {
            "bounty_reward": 0,
            "stake_refund": 0,
            "total_payout": 0,
            "payout_type": "PENDING",
            "bounty_reward_algo": 0,
            "stake_refund_algo": 0,
            "total_payout_algo": 0,
        }


def process_bounty_payout(
    evidence_id: str,
    category: str,
    verdict: str,
    wallet_address: str,
    stake_amount_microalgos: int,
    tx_id: str = None,
) -> dict:
    """
    Process bounty payout for a whistleblower after verification.
    Only the user (whistleblower) receives money.
    """
    if evidence_id in _bounty_payouts:
        return {
            "error": "Bounty already processed for this evidence",
            "existing": _bounty_payouts[evidence_id],
        }

    payout = calculate_payout(category, stake_amount_microalgos, verdict)

    record = {
        "evidence_id": evidence_id,
        "category": category,
        "verdict": verdict,
        "wallet_address": wallet_address,
        "stake_amount_microalgos": stake_amount_microalgos,
        **payout,
        "processed_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "processed_timestamp": int(time.time()),
        "on_chain_tx": tx_id,
        "status": "PAID" if payout["total_payout"] > 0 else (
            "FORFEITED" if verdict == "REJECTED" else "PENDING"
        ),
    }

    _bounty_payouts[evidence_id] = record
    return record


def get_bounty_payout(evidence_id: str) -> Optional[dict]:
    """Get bounty payout record for an evidence item."""
    return _bounty_payouts.get(evidence_id)


def get_all_bounty_payouts() -> list[dict]:
    """Get all bounty payout records."""
    return list(_bounty_payouts.values())


def get_bounty_stats() -> dict:
    """Get aggregate bounty statistics."""
    total = len(_bounty_payouts)
    paid = [p for p in _bounty_payouts.values() if p["status"] == "PAID"]
    forfeited = [p for p in _bounty_payouts.values() if p["status"] == "FORFEITED"]

    total_paid_algo = sum(p["total_payout"] for p in paid) / 1_000_000
    total_bounty_algo = sum(p["bounty_reward"] for p in paid) / 1_000_000
    total_refunded_algo = sum(p["stake_refund"] for p in paid) / 1_000_000
    total_forfeited_algo = sum(
        p["stake_amount_microalgos"] for p in forfeited
    ) / 1_000_000

    return {
        "total_processed": total,
        "total_paid": len(paid),
        "total_forfeited": len(forfeited),
        "total_paid_algo": total_paid_algo,
        "total_bounty_algo": total_bounty_algo,
        "total_refunded_algo": total_refunded_algo,
        "total_forfeited_algo": total_forfeited_algo,
        "bounty_rates": {
            cat: amt / 1_000_000 for cat, amt in BOUNTY_REWARDS.items()
        },
    }


def get_bounty_info(category: str) -> dict:
    """Get bounty reward info for a category."""
    cat = category.upper()
    bounty = BOUNTY_REWARDS.get(cat, 100_000_000)
    return {
        "category": cat,
        "bounty_reward_algo": bounty / 1_000_000,
        "bounty_reward_microalgos": bounty,
        "description": f"Whistleblower receives {bounty / 1_000_000:.0f} ALGO bounty + full stake refund if evidence is verified",
    }
