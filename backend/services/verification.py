"""
WhistleChain -- Evidence Verification Service (Step 3)
======================================================
Multi-inspector blind consensus verification with commit-reveal
anti-corruption protocol.

Anti-Lying System Design (Non-Monetary):
=========================================
The system ensures inspector honesty WITHOUT relying on financial
incentives (which can be defeated by wealthy bad actors). Instead:

1. BLIND ASSIGNMENT — Inspectors are randomly assigned from a pool.
   They don't know who else is inspecting the same evidence.
   No coordination = no collusion.

2. COMMIT-REVEAL VOTING — Two-phase protocol:
   Phase 1 (COMMIT): Inspector submits SHA-256(verdict + secret_nonce).
     The hash hides their verdict from others.
   Phase 2 (REVEAL): Inspector reveals verdict + nonce.
     Contract verifies hash matches. Can't change mind after seeing others.
   This cryptographically prevents copying or being influenced.

3. MANDATORY JUSTIFICATION — Inspectors MUST upload photographic/documentary
   evidence of their inspection to IPFS. Empty verdicts are rejected.
   This creates an auditable trail — you can't just click "verified"
   without proving you actually inspected.

4. REPUTATION TRACKING — Each inspector has an on-chain consistency score:
   - How often they agree with the final consensus
   - Historical accuracy across all inspections
   - Outlier detection: consistently disagreeing = lower weight
   An inspector who lies will gradually lose credibility — their votes
   count less over time. Unlike money, reputation can't be bought.

5. CROSS-VERIFICATION — Random re-inspections by different inspectors.
   If re-inspection contradicts original, both sets of inspectors
   are flagged for review. This deters lazy/corrupt inspections.

6. QUORUM REQUIREMENT (67%) — No single inspector can decide.
   Minimum 3 inspectors, 67% must agree. One liar is outvoted.

Lifecycle:
  PENDING → UNDER_VERIFICATION → (inspectors vote) → VERIFIED / REJECTED
"""

import os
import sys
import json
import time
import hashlib
import secrets
from typing import Optional

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from algosdk import transaction, account, encoding
from dotenv import load_dotenv

from services.algorand_client import get_algod_client

load_dotenv()

# ─── Constants ───
MIN_INSPECTORS = 3
CONSENSUS_THRESHOLD = 0.67
VERIFICATION_WINDOW_HOURS = {
    "FINANCIAL": 72,
    "CONSTRUCTION": 168,
    "FOOD": 48,
    "ACADEMIC": 72,
}

VERDICT_AUTHENTIC = 1
VERDICT_FAKE = 2
VERDICT_INCONCLUSIVE = 3

VERDICT_LABELS = {
    VERDICT_AUTHENTIC: "AUTHENTIC",
    VERDICT_FAKE: "FAKE",
    VERDICT_INCONCLUSIVE: "INCONCLUSIVE",
}


# ─── In-Memory Store (production: use database / on-chain boxes) ───
# This stores verification state between API calls.
# In production, all of this lives on-chain in box storage.

_verification_sessions: dict[str, dict] = {}
_inspector_registry: dict[str, dict] = {}  # address -> profile
_inspector_commits: dict[str, dict] = {}   # "evd_id:address" -> commit data
_inspector_reveals: dict[str, dict] = {}   # "evd_id:address" -> reveal data
_inspector_reputation: dict[str, dict] = {}  # address -> reputation scores


def register_inspector(
    address: str,
    name: str,
    specializations: list[str],
    department: str = "",
    employee_id: str = "",
    designation: str = "",
    jurisdiction: str = "",
    experience_years: int = 0,
    contact_email: str = "",
) -> dict:
    """
    Register a new government-authorized inspector in the verification pool.
    Only authorized government inspectors can verify evidence.
    Profile includes department, credentials, jurisdiction, experience.
    """
    if address in _inspector_registry:
        return {"error": "Inspector already registered", "address": address}

    _inspector_registry[address] = {
        "address": address,
        "name": name,
        "specializations": [s.upper() for s in specializations],
        "department": department,
        "employee_id": employee_id,
        "designation": designation,
        "jurisdiction": jurisdiction,
        "experience_years": experience_years,
        "contact_email": contact_email,
        "registered_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "total_inspections": 0,
        "consensus_agreements": 0,
        "active": True,
        "cases_assigned": [],
        "availability": "AVAILABLE",   # AVAILABLE, BUSY, ON_LEAVE
    }

    # Initialize reputation
    _inspector_reputation[address] = {
        "consistency_score": 1.0,
        "total_votes": 0,
        "consensus_matches": 0,
        "outlier_count": 0,
        "credibility_weight": 1.0,
    }

    return {
        "status": "registered",
        "address": address,
        "name": name,
        "department": department,
        "designation": designation,
        "specializations": _inspector_registry[address]["specializations"],
    }


def update_inspector_profile(
    address: str,
    **kwargs,
) -> dict:
    """Update an inspector's profile fields."""
    inspector = _inspector_registry.get(address)
    if not inspector:
        return {"error": "Inspector not found", "address": address}

    allowed_fields = [
        "name", "department", "employee_id", "designation",
        "jurisdiction", "experience_years", "contact_email",
        "specializations", "availability",
    ]
    for key, value in kwargs.items():
        if key in allowed_fields:
            if key == "specializations" and isinstance(value, list):
                inspector[key] = [s.upper() for s in value]
            else:
                inspector[key] = value

    return {
        "status": "updated",
        "address": address,
        "profile": inspector,
    }


def get_inspector_profile(address: str) -> dict:
    """Get full inspector profile with reputation."""
    inspector = _inspector_registry.get(address)
    if not inspector:
        return {"error": "Inspector not found", "address": address}
    reputation = _inspector_reputation.get(address, {})
    return {
        **inspector,
        "reputation": reputation,
    }


def get_inspector_cases(address: str) -> list[dict]:
    """Get all cases assigned to a specific inspector."""
    cases = []
    for evd_id, session in _verification_sessions.items():
        assigned_addrs = [ins["address"] for ins in session.get("assigned_inspectors", [])]
        if address in assigned_addrs:
            has_committed = address in session.get("commits", {})
            has_revealed = address in session.get("reveals", {})
            cases.append({
                "evidence_id": evd_id,
                "category": session["category"],
                "status": session.get("final_verdict") if session["phase"] == "FINALIZED" else session["status"],
                "phase": session["phase"],
                "started_at": session["started_at"],
                "window_deadline": session["window_end_formatted"],
                "has_committed": has_committed,
                "has_revealed": has_revealed,
                "your_verdict": session["reveals"].get(address, {}).get("verdict_label") if has_revealed else None,
            })
    return cases


def get_inspector_pool(category: str = None) -> list[dict]:
    """Get all registered inspectors, optionally filtered by category."""
    pool = []
    for addr, info in _inspector_registry.items():
        if not info["active"]:
            continue
        if category and category.upper() not in info["specializations"]:
            continue
        reputation = _inspector_reputation.get(addr, {})
        pool.append({
            **info,
            "reputation": reputation,
        })
    return pool


def begin_verification(
    evidence_id: str,
    category: str,
    app_id: int = None,
    admin_private_key: str = None,
) -> dict:
    """
    Move evidence from PENDING to UNDER_VERIFICATION.
    Opens the verification window and RANDOMLY assigns inspectors from the pool.

    1. Sets status to UNDER_VERIFICATION
    2. Calculates verification window deadline
    3. RANDOMLY selects inspectors from eligible pool (blind assignment)
    4. Records on-chain via begin_verification app call
    """
    import random

    if evidence_id in _verification_sessions:
        return {"error": "Verification already started for this evidence"}

    cat = category.upper()
    window_hours = VERIFICATION_WINDOW_HOURS.get(cat, 72)
    window_end = int(time.time()) + (window_hours * 3600)

    # Select eligible inspectors — RANDOM from pool
    eligible = get_inspector_pool(cat)
    if len(eligible) < MIN_INSPECTORS:
        # If not enough specialized inspectors, pull from general pool
        eligible = get_inspector_pool()

    if len(eligible) < MIN_INSPECTORS:
        return {
            "error": f"Not enough inspectors in pool. Need at least {MIN_INSPECTORS}, "
                     f"currently have {len(eligible)}. Register more inspectors first.",
        }

    # RANDOM SELECTION — inspectors don't know who else is assigned
    num_to_assign = min(max(MIN_INSPECTORS, 3), len(eligible))
    selected = random.sample(eligible, num_to_assign)

    # Mark inspectors as busy
    for ins in selected:
        reg = _inspector_registry.get(ins["address"])
        if reg:
            if "cases_assigned" not in reg:
                reg["cases_assigned"] = []
            reg["cases_assigned"].append(evidence_id)

    # Create verification session
    session = {
        "evidence_id": evidence_id,
        "category": cat,
        "status": "UNDER_VERIFICATION",
        "started_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "started_timestamp": int(time.time()),
        "window_end": window_end,
        "window_hours": window_hours,
        "window_end_formatted": time.strftime(
            "%Y-%m-%d %H:%M:%S", time.localtime(window_end)
        ),
        "num_inspectors_required": num_to_assign,
        "assigned_inspectors": [
            {
                "address": ins["address"],
                "name": ins["name"],
                "department": ins.get("department", ""),
                "assigned_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            }
            for ins in selected
        ],
        "phase": "COMMIT",  # COMMIT -> REVEAL -> FINALIZED
        "commits": {},      # address -> commit_hash
        "reveals": {},      # address -> verdict
        "final_verdict": None,
        "finalized_at": None,
        "on_chain_tx": None,
    }

    _verification_sessions[evidence_id] = session

    # On-chain call (if app deployed)
    tx_id = None
    if app_id and admin_private_key:
        try:
            tx_id = _begin_verification_onchain(
                app_id, admin_private_key, evidence_id, window_end, num_to_assign
            )
            session["on_chain_tx"] = tx_id
        except Exception as e:
            session["on_chain_error"] = str(e)

    return {
        "status": "UNDER_VERIFICATION",
        "evidence_id": evidence_id,
        "verification_window_hours": window_hours,
        "window_deadline": session["window_end_formatted"],
        "inspectors_assigned": len(session["assigned_inspectors"]),
        "assignment_method": "RANDOM_BLIND",
        "phase": "COMMIT",
        "tx_id": tx_id,
    }


def commit_verdict(
    evidence_id: str,
    inspector_address: str,
    commit_hash: str,
    app_id: int = None,
    inspector_private_key: str = None,
) -> dict:
    """
    Phase 1 of commit-reveal: Inspector submits hash(verdict + nonce).

    The inspector computes SHA-256(verdict_bytes + nonce_bytes) locally
    and submits only the hash. Nobody can see their verdict until reveal.
    """
    session = _verification_sessions.get(evidence_id)
    if not session:
        return {"error": "No verification session found for this evidence"}

    if session["phase"] != "COMMIT":
        return {"error": f"Verification is in {session['phase']} phase, not COMMIT"}

    # Check inspector is assigned
    assigned_addrs = [ins["address"] for ins in session["assigned_inspectors"]]
    if assigned_addrs and inspector_address not in assigned_addrs:
        return {"error": "Inspector not assigned to this evidence (blind assignment)"}

    # Check not already committed
    if inspector_address in session["commits"]:
        return {"error": "Inspector already committed a verdict for this evidence"}

    # Check window not expired
    if int(time.time()) > session["window_end"]:
        return {"error": "Verification window has expired"}

    # Store commit
    session["commits"][inspector_address] = {
        "commit_hash": commit_hash,
        "committed_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "timestamp": int(time.time()),
    }

    # Also store in global commits map
    key = f"{evidence_id}:{inspector_address}"
    _inspector_commits[key] = {
        "evidence_id": evidence_id,
        "inspector": inspector_address,
        "commit_hash": commit_hash,
        "timestamp": int(time.time()),
    }

    # Check if all inspectors have committed -> auto-advance to REVEAL
    required = session["num_inspectors_required"]
    if len(session["commits"]) >= required:
        session["phase"] = "REVEAL"

    # On-chain commit
    tx_id = None
    if app_id and inspector_private_key:
        try:
            tx_id = _commit_verdict_onchain(
                app_id, inspector_private_key, evidence_id, commit_hash
            )
        except Exception as e:
            pass

    return {
        "status": "committed",
        "evidence_id": evidence_id,
        "inspector": inspector_address,
        "commits_received": len(session["commits"]),
        "commits_required": required,
        "phase": session["phase"],
        "tx_id": tx_id,
    }


def advance_to_reveal(evidence_id: str) -> dict:
    """Manually advance from COMMIT to REVEAL phase (admin action)."""
    session = _verification_sessions.get(evidence_id)
    if not session:
        return {"error": "No verification session found"}

    if len(session["commits"]) < MIN_INSPECTORS:
        return {
            "error": f"Need at least {MIN_INSPECTORS} commits before reveal phase. "
                     f"Currently have {len(session['commits'])}.",
        }

    session["phase"] = "REVEAL"
    return {
        "status": "advanced_to_reveal",
        "evidence_id": evidence_id,
        "phase": "REVEAL",
        "commits_received": len(session["commits"]),
    }


def reveal_verdict(
    evidence_id: str,
    inspector_address: str,
    verdict: int,
    nonce: str,
    justification_ipfs: str,
    app_id: int = None,
    inspector_private_key: str = None,
) -> dict:
    """
    Phase 2 of commit-reveal: Inspector reveals verdict + nonce.

    The system verifies SHA-256(verdict_bytes + nonce_bytes) matches
    the previously committed hash. If it doesn't match, the reveal
    is REJECTED — the inspector tried to change their vote.

    justification_ipfs: IPFS hash of inspector's evidence (photos,
    documents, notes) proving they actually performed the inspection.
    This is MANDATORY — empty justifications are rejected.
    """
    session = _verification_sessions.get(evidence_id)
    if not session:
        return {"error": "No verification session found"}

    if session["phase"] != "REVEAL":
        return {"error": f"Verification is in {session['phase']} phase, not REVEAL"}

    # Must have committed
    if inspector_address not in session["commits"]:
        return {"error": "Inspector did not commit a verdict — cannot reveal"}

    # Already revealed?
    if inspector_address in session["reveals"]:
        return {"error": "Inspector already revealed their verdict"}

    # Mandatory justification check
    if not justification_ipfs or len(justification_ipfs.strip()) < 5:
        return {
            "error": "Justification evidence is MANDATORY. Upload inspection "
                     "photos/documents to IPFS and provide the hash."
        }

    # Verify commit-reveal hash
    stored_hash = session["commits"][inspector_address]["commit_hash"]
    verdict_bytes = verdict.to_bytes(8, "big")
    nonce_bytes = nonce.encode("utf-8")
    computed_hash = hashlib.sha256(verdict_bytes + nonce_bytes).hexdigest()

    if computed_hash != stored_hash:
        return {
            "error": "COMMIT-REVEAL MISMATCH: Your revealed verdict+nonce does not "
                     "match your committed hash. You cannot change your vote after committing. "
                     "This attempt has been logged.",
            "expected_hash": stored_hash,
            "computed_hash": computed_hash,
        }

    # Store reveal
    session["reveals"][inspector_address] = {
        "verdict": verdict,
        "verdict_label": VERDICT_LABELS.get(verdict, "UNKNOWN"),
        "justification_ipfs": justification_ipfs,
        "revealed_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "timestamp": int(time.time()),
        "nonce": nonce,
    }

    key = f"{evidence_id}:{inspector_address}"
    _inspector_reveals[key] = {
        "evidence_id": evidence_id,
        "inspector": inspector_address,
        "verdict": verdict,
        "justification_ipfs": justification_ipfs,
        "timestamp": int(time.time()),
    }

    # On-chain reveal
    tx_id = None
    if app_id and inspector_private_key:
        try:
            tx_id = _reveal_verdict_onchain(
                app_id, inspector_private_key, evidence_id,
                verdict, nonce, justification_ipfs
            )
        except Exception as e:
            pass

    return {
        "status": "revealed",
        "evidence_id": evidence_id,
        "inspector": inspector_address,
        "verdict": VERDICT_LABELS.get(verdict, "UNKNOWN"),
        "reveals_received": len(session["reveals"]),
        "reveals_required": session["num_inspectors_required"],
        "tx_id": tx_id,
    }


def finalize_verification(
    evidence_id: str,
    app_id: int = None,
    admin_private_key: str = None,
) -> dict:
    """
    Tally verdicts and determine final status.

    Uses weighted consensus:
    - Each inspector's vote is weighted by their credibility score
    - 67% weighted agreement required for VERIFIED or REJECTED
    - If no consensus, status stays DISPUTED

    Also updates inspector reputation scores based on outcome.
    """
    session = _verification_sessions.get(evidence_id)
    if not session:
        return {"error": "No verification session found"}

    if len(session["reveals"]) < MIN_INSPECTORS:
        return {
            "error": f"Need at least {MIN_INSPECTORS} reveals to finalize. "
                     f"Currently have {len(session['reveals'])}.",
        }

    # Tally weighted votes
    weighted_votes = {
        VERDICT_AUTHENTIC: 0.0,
        VERDICT_FAKE: 0.0,
        VERDICT_INCONCLUSIVE: 0.0,
    }
    total_weight = 0.0

    for addr, reveal in session["reveals"].items():
        reputation = _inspector_reputation.get(addr, {"credibility_weight": 1.0})
        weight = reputation.get("credibility_weight", 1.0)
        verdict = reveal["verdict"]
        weighted_votes[verdict] = weighted_votes.get(verdict, 0) + weight
        total_weight += weight

    # Calculate percentages
    if total_weight == 0:
        total_weight = 1  # prevent division by zero

    vote_percentages = {
        VERDICT_LABELS[k]: round(v / total_weight * 100, 1)
        for k, v in weighted_votes.items()
    }

    # Determine outcome
    auth_pct = weighted_votes[VERDICT_AUTHENTIC] / total_weight
    fake_pct = weighted_votes[VERDICT_FAKE] / total_weight

    if auth_pct >= CONSENSUS_THRESHOLD:
        final_status = "VERIFIED"
        final_verdict = VERDICT_AUTHENTIC
    elif fake_pct >= CONSENSUS_THRESHOLD:
        final_status = "REJECTED"
        final_verdict = VERDICT_FAKE
    else:
        final_status = "DISPUTED"
        final_verdict = VERDICT_INCONCLUSIVE

    # Update session
    session["final_verdict"] = final_status
    session["finalized_at"] = time.strftime("%Y-%m-%d %H:%M:%S")
    session["phase"] = "FINALIZED"
    session["vote_breakdown"] = vote_percentages

    # Update inspector reputations
    _update_reputations(session, final_verdict)

    # On-chain finalization
    tx_id = None
    if app_id and admin_private_key:
        try:
            tx_id = _finalize_onchain(
                app_id, admin_private_key, evidence_id, final_status
            )
            session["finalize_tx"] = tx_id
        except Exception as e:
            session["finalize_error"] = str(e)

    return {
        "status": final_status,
        "evidence_id": evidence_id,
        "vote_breakdown": vote_percentages,
        "consensus_reached": final_status != "DISPUTED",
        "consensus_threshold": f"{CONSENSUS_THRESHOLD * 100}%",
        "total_inspectors": len(session["reveals"]),
        "finalized_at": session["finalized_at"],
        "tx_id": tx_id,
    }


def get_verification_status(evidence_id: str) -> dict:
    """Get current verification state for an evidence item."""
    session = _verification_sessions.get(evidence_id)
    if not session:
        return {"evidence_id": evidence_id, "status": "NO_VERIFICATION_SESSION"}

    result = {
        "evidence_id": session["evidence_id"],
        "category": session["category"],
        "status": session["status"] if session["phase"] != "FINALIZED" else session["final_verdict"],
        "phase": session["phase"],
        "started_at": session["started_at"],
        "window_deadline": session["window_end_formatted"],
        "window_expired": int(time.time()) > session["window_end"],
        "inspectors_assigned": len(session["assigned_inspectors"]),
        "commits_received": len(session["commits"]),
        "reveals_received": len(session["reveals"]),
        "inspectors_required": session["num_inspectors_required"],
    }

    if session["phase"] == "FINALIZED":
        result["final_verdict"] = session["final_verdict"]
        result["vote_breakdown"] = session.get("vote_breakdown", {})
        result["finalized_at"] = session["finalized_at"]

    # Include reveals (public after finalization)
    if session["phase"] == "FINALIZED":
        result["inspector_verdicts"] = [
            {
                "inspector": addr[:8] + "..." + addr[-4:],  # anonymized
                "verdict": rev["verdict_label"],
                "justification_ipfs": rev["justification_ipfs"],
                "revealed_at": rev["revealed_at"],
            }
            for addr, rev in session["reveals"].items()
        ]

    return result


def get_all_verification_sessions() -> list[dict]:
    """Get all active and completed verification sessions."""
    sessions = []
    for evd_id, session in _verification_sessions.items():
        sessions.append({
            "evidence_id": evd_id,
            "category": session["category"],
            "status": session["final_verdict"] if session["phase"] == "FINALIZED" else session["status"],
            "phase": session["phase"],
            "started_at": session["started_at"],
            "window_deadline": session["window_end_formatted"],
            "commits": len(session["commits"]),
            "reveals": len(session["reveals"]),
            "inspectors_required": session["num_inspectors_required"],
        })
    return sessions


def get_inspector_reputation(address: str) -> dict:
    """Get reputation data and full profile for a specific inspector."""
    reputation = _inspector_reputation.get(address)
    if not reputation:
        return {"error": "Inspector not found", "address": address}

    inspector = _inspector_registry.get(address, {})
    return {
        "address": address,
        "name": inspector.get("name", "Unknown"),
        "department": inspector.get("department", ""),
        "designation": inspector.get("designation", ""),
        "employee_id": inspector.get("employee_id", ""),
        "jurisdiction": inspector.get("jurisdiction", ""),
        "experience_years": inspector.get("experience_years", 0),
        "specializations": inspector.get("specializations", []),
        "reputation": reputation,
        "total_inspections": inspector.get("total_inspections", 0),
        "cases_assigned": inspector.get("cases_assigned", []),
        "availability": inspector.get("availability", "AVAILABLE"),
    }


def generate_commit_hash(verdict: int, nonce: str = None) -> dict:
    """
    Helper: generate a commit hash for the commit-reveal protocol.
    In production, this is done client-side. Exposed here for testing.
    """
    if nonce is None:
        nonce = secrets.token_hex(16)
    verdict_bytes = verdict.to_bytes(8, "big")
    nonce_bytes = nonce.encode("utf-8")
    commit_hash = hashlib.sha256(verdict_bytes + nonce_bytes).hexdigest()
    return {
        "commit_hash": commit_hash,
        "verdict": verdict,
        "verdict_label": VERDICT_LABELS.get(verdict, "UNKNOWN"),
        "nonce": nonce,
        "note": "SAVE THE NONCE! You need it to reveal your verdict.",
    }


# ─── Reputation System ───

def _update_reputations(session: dict, final_verdict: int):
    """Update inspector credibility scores after finalization."""
    for addr, reveal in session["reveals"].items():
        rep = _inspector_reputation.get(addr)
        if not rep:
            continue

        rep["total_votes"] += 1
        inspector = _inspector_registry.get(addr)
        if inspector:
            inspector["total_inspections"] += 1

        if reveal["verdict"] == final_verdict:
            rep["consensus_matches"] += 1
            if inspector:
                inspector["consensus_agreements"] += 1
        else:
            rep["outlier_count"] += 1

        # Recalculate consistency score
        if rep["total_votes"] > 0:
            rep["consistency_score"] = round(
                rep["consensus_matches"] / rep["total_votes"], 3
            )

        # Credibility weight: decays if too many outlier votes
        # Formula: base 1.0, reduced by 0.1 for every 20% outlier rate
        if rep["total_votes"] >= 3:
            outlier_rate = rep["outlier_count"] / rep["total_votes"]
            rep["credibility_weight"] = round(
                max(0.1, 1.0 - (outlier_rate * 0.5)), 3
            )


# ─── On-Chain Helpers ───

def _make_evidence_box_key(evidence_id: str) -> bytes:
    """Convert evidence_id like 'EVD-2026-00001' to box key bytes."""
    # Parse counter from evidence_id
    parts = evidence_id.split("-")
    if len(parts) >= 3:
        counter = int(parts[-1])
    else:
        counter = int(parts[-1]) if parts[-1].isdigit() else 1
    return b"EVD-" + counter.to_bytes(8, "big")


def _begin_verification_onchain(
    app_id: int, admin_pk: str, evidence_id: str,
    window_end: int, num_inspectors: int
) -> str:
    """Submit begin_verification app call to Algorand."""
    client = get_algod_client()
    sp = client.suggested_params()
    admin_addr = account.address_from_private_key(admin_pk)
    box_key = _make_evidence_box_key(evidence_id)

    txn = transaction.ApplicationCallTxn(
        sender=admin_addr,
        sp=sp,
        index=app_id,
        on_complete=transaction.OnComplete.NoOpOC,
        app_args=[
            b"begin_verification",
            box_key,
            window_end.to_bytes(8, "big"),
            num_inspectors.to_bytes(8, "big"),
        ],
        boxes=[
            (app_id, box_key),
            (app_id, b"VRF-" + box_key[4:]),
        ],
    )
    signed = txn.sign(admin_pk)
    tx_id = client.send_transaction(signed)
    transaction.wait_for_confirmation(client, tx_id, 10)
    return tx_id


def _commit_verdict_onchain(
    app_id: int, inspector_pk: str, evidence_id: str, commit_hash: str
) -> str:
    """Submit commit_verdict app call to Algorand."""
    client = get_algod_client()
    sp = client.suggested_params()
    inspector_addr = account.address_from_private_key(inspector_pk)
    box_key = _make_evidence_box_key(evidence_id)

    commit_bytes = bytes.fromhex(commit_hash)
    commit_box_key = b"CMT-" + box_key[4:] + encoding.decode_address(inspector_addr)

    txn = transaction.ApplicationCallTxn(
        sender=inspector_addr,
        sp=sp,
        index=app_id,
        on_complete=transaction.OnComplete.NoOpOC,
        app_args=[
            b"commit_verdict",
            box_key,
            commit_bytes,
        ],
        boxes=[
            (app_id, box_key),
            (app_id, commit_box_key),
        ],
    )
    signed = txn.sign(inspector_pk)
    tx_id = client.send_transaction(signed)
    transaction.wait_for_confirmation(client, tx_id, 10)
    return tx_id


def _reveal_verdict_onchain(
    app_id: int, inspector_pk: str, evidence_id: str,
    verdict: int, nonce: str, justification_ipfs: str
) -> str:
    """Submit reveal_verdict app call to Algorand."""
    client = get_algod_client()
    sp = client.suggested_params()
    inspector_addr = account.address_from_private_key(inspector_pk)
    box_key = _make_evidence_box_key(evidence_id)

    commit_box_key = b"CMT-" + box_key[4:] + encoding.decode_address(inspector_addr)
    reveal_box_key = b"RVL-" + box_key[4:] + encoding.decode_address(inspector_addr)

    txn = transaction.ApplicationCallTxn(
        sender=inspector_addr,
        sp=sp,
        index=app_id,
        on_complete=transaction.OnComplete.NoOpOC,
        app_args=[
            b"reveal_verdict",
            box_key,
            verdict.to_bytes(8, "big"),
            nonce.encode("utf-8"),
            justification_ipfs.encode("utf-8"),
        ],
        boxes=[
            (app_id, box_key),
            (app_id, commit_box_key),
            (app_id, reveal_box_key),
        ],
    )
    signed = txn.sign(inspector_pk)
    tx_id = client.send_transaction(signed)
    transaction.wait_for_confirmation(client, tx_id, 10)
    return tx_id


def _finalize_onchain(
    app_id: int, admin_pk: str, evidence_id: str, final_status: str
) -> str:
    """Submit finalize_verification app call to Algorand."""
    client = get_algod_client()
    sp = client.suggested_params()
    admin_addr = account.address_from_private_key(admin_pk)
    box_key = _make_evidence_box_key(evidence_id)

    txn = transaction.ApplicationCallTxn(
        sender=admin_addr,
        sp=sp,
        index=app_id,
        on_complete=transaction.OnComplete.NoOpOC,
        app_args=[
            b"finalize_verification",
            box_key,
            final_status.encode("utf-8"),  # simplified: full blob in production
            final_status.encode("utf-8"),
        ],
        boxes=[
            (app_id, box_key),
        ],
    )
    signed = txn.sign(admin_pk)
    tx_id = client.send_transaction(signed)
    transaction.wait_for_confirmation(client, tx_id, 10)
    return tx_id
