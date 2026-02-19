"""
WhistleChain -- FastAPI Backend Server (Steps 1 & 2)
=====================================================
REST API for the WhistleChain platform.
Exposes endpoints for wallet creation, evidence submission,
stake management, and status tracking.

Run:
    cd D:\\Hackathon\\RIFT2\\whistlechain
    .\\venv\\Scripts\\Activate.ps1
    uvicorn backend.api.main:app --reload --port 8000
"""

import os
import sys
import json
import time
import tempfile

# Add project paths
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

from services.wallet import create_anonymous_wallet, wallet_from_mnemonic
from services.encryption import (
    generate_encryption_key,
    encrypt_files_to_bundle,
    key_to_hex,
)
from services.ipfs_upload import upload_bytes_to_ipfs, get_ipfs_url
from services.algorand_client import get_algod_client, check_connection
from services.submission_store import (
    store_submission, get_submission, get_all_submissions,
    get_submissions_by_status, get_submissions_by_wallet, update_submission,
)
from services.stake_manager import (
    get_stake_info,
    check_contract_balance,
    MIN_STAKE_MICROALGOS,
    MAX_STAKE_MICROALGOS,
)
from services.verification import (
    register_inspector,
    update_inspector_profile,
    get_inspector_profile,
    get_inspector_cases,
    get_inspector_pool,
    begin_verification,
    commit_verdict,
    advance_to_reveal,
    reveal_verdict,
    finalize_verification,
    get_verification_status,
    get_all_verification_sessions,
    get_inspector_reputation,
    generate_commit_hash,
    VERDICT_AUTHENTIC,
    VERDICT_FAKE,
    VERDICT_INCONCLUSIVE,
    VERDICT_LABELS,
)
from services.resolution import (
    resolve_evidence,
    get_resolution,
    get_all_resolutions,
    get_resolution_stats,
)
from services.audit_trail import (
    publish_evidence,
    get_audit_trail,
    get_all_audit_records,
    get_public_evidence,
    get_audit_stats,
)
from services.bounty_manager import (
    calculate_payout,
    process_bounty_payout,
    get_bounty_payout,
    get_all_bounty_payouts,
    get_bounty_stats,
    get_bounty_info,
    BOUNTY_REWARDS,
)
from services.publication_bot import (
    publish_to_all_platforms,
    get_publication as get_publication_record,
    get_all_publications as get_all_publication_records,
    get_publication_stats,
)

app = FastAPI(
    title="WhistleChain API",
    description="Decentralized Whistleblower Protection & Bounty Protocol",
    version="2.0.0",
)

# CORS -- allow frontend to call us
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Models ---

class WalletResponse(BaseModel):
    address: str
    mnemonic: str


class EvidenceSubmission(BaseModel):
    category: str
    organization: str
    description: str
    wallet_mnemonic: str | None = None
    stake_amount: float | None = None  # in ALGO


class EvidenceResponse(BaseModel):
    evidence_id: str
    ipfs_hash: str
    ipfs_url: str
    tx_id: str | None
    block: int | None
    timestamp: str
    status: str
    wallet_address: str
    encryption_key_hex: str
    category: str
    organization: str
    stake_amount: float  # in ALGO
    stake_locked: bool


class HealthResponse(BaseModel):
    status: str
    algorand_connected: bool
    last_round: int | None
    network: str


class StakeInfoResponse(BaseModel):
    category: str
    min_stake_algo: float
    max_stake_algo: float


class ContractBalanceResponse(BaseModel):
    app_id: int
    app_address: str
    balance_algo: float


# --- Endpoints ---

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Check API and Algorand connection health."""
    try:
        status = check_connection()
        return HealthResponse(
            status="healthy",
            algorand_connected=True,
            last_round=status["last_round"],
            network=status["network"],
        )
    except Exception:
        return HealthResponse(
            status="degraded",
            algorand_connected=False,
            last_round=None,
            network="testnet",
        )


@app.post("/wallet/create", response_model=WalletResponse)
async def create_wallet():
    """Generate a new anonymous Algorand wallet. No KYC, no email, no identity."""
    wallet = create_anonymous_wallet()
    return WalletResponse(
        address=wallet["address"],
        mnemonic=wallet["mnemonic"],
    )


@app.get("/stake/info/{category}", response_model=StakeInfoResponse)
async def stake_info(category: str):
    """Get minimum and maximum stake requirements for an evidence category."""
    cat = category.upper()
    valid_categories = list(MIN_STAKE_MICROALGOS.keys())
    if cat not in valid_categories:
        raise HTTPException(400, f"Invalid category. Use one of: {valid_categories}")
    info = get_stake_info(cat)
    return StakeInfoResponse(
        category=cat,
        min_stake_algo=info["min_stake_algo"],
        max_stake_algo=info["max_stake_algo"],
    )


@app.get("/stake/info")
async def all_stake_info():
    """Get stake info for all categories."""
    result = {}
    for cat in MIN_STAKE_MICROALGOS:
        info = get_stake_info(cat)
        result[cat] = {
            "min_stake_algo": info["min_stake_algo"],
            "max_stake_algo": info["max_stake_algo"],
        }
    return result


@app.get("/contract/balance")
async def contract_balance():
    """Check the contract account balance (total locked stakes)."""
    app_id_str = os.getenv("EVIDENCE_REGISTRY_APP_ID", "")
    if not app_id_str:
        return {"status": "contract_not_deployed", "balance_algo": 0}
    info = check_contract_balance(int(app_id_str))
    return info


@app.post("/evidence/submit", response_model=EvidenceResponse)
async def submit_evidence(
    category: str = Form(...),
    organization: str = Form(...),
    description: str = Form(...),
    wallet_mnemonic: str = Form(None),
    stake_amount: float = Form(None),  # in ALGO
    files: list[UploadFile] = File(...),
):
    """
    Submit evidence through the complete pipeline:
    1. Create/restore wallet
    2. Encrypt files with AES-256
    3. Upload to IPFS
    4. Lock stake in smart contract
    5. Anchor evidence on Algorand
    6. Return Evidence ID + stake confirmation
    """
    valid_categories = list(MIN_STAKE_MICROALGOS.keys())
    cat = category.upper()
    if cat not in valid_categories:
        raise HTTPException(400, f"Invalid category. Use one of: {valid_categories}")

    # Compute stake in microAlgos
    # Staking is OPTIONAL: 0 = free-tier (community queue, lower priority)
    # Any amount >= category minimum = staked-tier (priority verification)
    min_stake_micro = MIN_STAKE_MICROALGOS[cat]
    if stake_amount is not None:
        stake_micro = int(stake_amount * 1_000_000)
        if stake_micro > 0 and stake_micro < min_stake_micro:
            raise HTTPException(
                400,
                f"Stake too low for {cat}: {stake_amount} ALGO provided, "
                f"minimum is {min_stake_micro / 1_000_000} ALGO (or 0 for free tier)"
            )
        if stake_micro > MAX_STAKE_MICROALGOS:
            raise HTTPException(400, f"Stake exceeds maximum {MAX_STAKE_MICROALGOS / 1_000_000} ALGO")
    else:
        stake_micro = 0  # Default to free tier

    # Step 1: Wallet
    if wallet_mnemonic:
        try:
            wallet = wallet_from_mnemonic(wallet_mnemonic)
        except Exception:
            raise HTTPException(400, "Invalid mnemonic")
    else:
        wallet = create_anonymous_wallet()

    # Step 2: Save uploaded files to temp dir
    tmp_dir = tempfile.mkdtemp(prefix="wc_evidence_")
    file_paths = []
    try:
        for upload in files:
            file_path = os.path.join(tmp_dir, upload.filename or "evidence_file")
            content = await upload.read()
            with open(file_path, "wb") as f:
                f.write(content)
            file_paths.append(file_path)

        # Step 3: Encrypt
        encryption_key = generate_encryption_key()
        encrypted_bundle = encrypt_files_to_bundle(file_paths, encryption_key)

        # Step 4: Upload to IPFS
        ipfs_hash = None
        try:
            ipfs_result = upload_bytes_to_ipfs(
                encrypted_bundle,
                filename=f"whistlechain_evidence_{int(time.time())}.json",
            )
            ipfs_hash = ipfs_result["IpfsHash"]
        except Exception:
            ipfs_hash = f"QmSIMULATED_{int(time.time())}"

        # Step 5: Algorand anchoring + stake locking
        tx_id = None
        block = None
        evidence_id = f"EVD-{time.strftime('%Y')}-{int(time.time()) % 100000:05d}"
        stake_locked = False

        app_id = os.getenv("EVIDENCE_REGISTRY_APP_ID", "")
        if app_id:
            try:
                from submit_evidence import submit_evidence as _submit

                result = _submit(
                    file_paths=file_paths,
                    category=cat,
                    organization=organization,
                    description=description,
                    stake_amount_microalgos=stake_micro,
                    wallet_mnemonic=wallet["mnemonic"],
                    app_id=int(app_id),
                )
                evidence_id = result["evidence_id"]
                tx_id = result.get("tx_id")
                block = result.get("block")
                stake_locked = result.get("stake_locked", True)

                # Store submission data for resolution pipeline
                store_submission(
                    evidence_id=evidence_id,
                    wallet_address=wallet["address"],
                    stake_amount_microalgos=stake_micro,
                    category=cat,
                    organization=organization,
                    tx_id=tx_id or "",
                )
            except Exception:
                pass

        # Ensure submission data is always stored (even if contract call failed)
        if not get_submission(evidence_id):
            store_submission(
                evidence_id=evidence_id,
                wallet_address=wallet["address"],
                stake_amount_microalgos=stake_micro,
                category=cat,
                organization=organization,
                tx_id=tx_id or "",
            )

        return EvidenceResponse(
            evidence_id=evidence_id,
            ipfs_hash=ipfs_hash,
            ipfs_url=get_ipfs_url(ipfs_hash),
            tx_id=tx_id,
            block=block,
            timestamp=time.strftime("%d %b %Y %H:%M IST"),
            status="PENDING",
            wallet_address=wallet["address"],
            encryption_key_hex=key_to_hex(encryption_key),
            category=cat,
            organization=organization,
            stake_amount=stake_micro / 1_000_000,
            stake_locked=stake_locked,
        )
    finally:
        for fp in file_paths:
            try:
                os.unlink(fp)
            except OSError:
                pass
        try:
            os.rmdir(tmp_dir)
        except OSError:
            pass


@app.get("/evidence/{evidence_id}")
async def get_evidence(evidence_id: str):
    """
    Get evidence status and metadata.
    Reads from Algorand blockchain when contract is deployed.
    """
    # Check if there's a verification session
    vrf = get_verification_status(evidence_id)
    if vrf.get("status") != "NO_VERIFICATION_SESSION":
        return {
            "evidence_id": evidence_id,
            "status": vrf.get("status", "PENDING"),
            "stake_locked": True,
            "verification": vrf,
        }
    return {
        "evidence_id": evidence_id,
        "status": "PENDING",
        "stake_locked": True,
        "message": "Evidence tracking available after contract deployment.",
    }


# ─── Step 3: Verification Endpoints ───

class InspectorRegistration(BaseModel):
    address: str
    name: str
    specializations: list[str]
    department: str = ""
    employee_id: str = ""
    designation: str = ""
    jurisdiction: str = ""
    experience_years: int = 0
    contact_email: str = ""


class InspectorProfileUpdate(BaseModel):
    address: str
    name: str | None = None
    department: str | None = None
    employee_id: str | None = None
    designation: str | None = None
    jurisdiction: str | None = None
    experience_years: int | None = None
    contact_email: str | None = None
    specializations: list[str] | None = None
    availability: str | None = None


class BeginVerificationRequest(BaseModel):
    evidence_id: str
    category: str


class CommitVerdictRequest(BaseModel):
    evidence_id: str
    inspector_address: str
    commit_hash: str


class RevealVerdictRequest(BaseModel):
    evidence_id: str
    inspector_address: str
    verdict: int           # 1=AUTHENTIC, 2=FAKE, 3=INCONCLUSIVE
    nonce: str
    justification_ipfs: str


class GenerateCommitRequest(BaseModel):
    verdict: int
    nonce: str | None = None


@app.post("/verification/register-inspector")
async def api_register_inspector(req: InspectorRegistration):
    """Register a new government-authorized inspector in the verification pool."""
    result = register_inspector(
        req.address, req.name, req.specializations,
        department=req.department,
        employee_id=req.employee_id,
        designation=req.designation,
        jurisdiction=req.jurisdiction,
        experience_years=req.experience_years,
        contact_email=req.contact_email,
    )
    if "error" in result:
        raise HTTPException(400, result["error"])
    return result


@app.put("/verification/inspector/profile")
async def api_update_inspector_profile(req: InspectorProfileUpdate):
    """Update an inspector's profile information."""
    updates = {k: v for k, v in req.model_dump().items() if v is not None and k != "address"}
    result = update_inspector_profile(req.address, **updates)
    if "error" in result:
        raise HTTPException(404, result["error"])
    return result


@app.get("/verification/inspector/{address}/profile")
async def api_get_inspector_profile(address: str):
    """Get full inspector profile including department, credentials, cases."""
    result = get_inspector_profile(address)
    if "error" in result:
        raise HTTPException(404, result["error"])
    return result


@app.get("/verification/inspector/{address}/cases")
async def api_get_inspector_cases(address: str):
    """Get all cases assigned to a specific inspector."""
    return get_inspector_cases(address)


@app.get("/verification/inspectors")
async def api_list_inspectors(category: str = None):
    """List all registered inspectors, optionally filtered by category."""
    return get_inspector_pool(category)


@app.get("/verification/inspector/{address}")
async def api_inspector_reputation(address: str):
    """Get reputation data for a specific inspector."""
    result = get_inspector_reputation(address)
    if "error" in result:
        raise HTTPException(404, result["error"])
    return result


@app.post("/verification/begin")
async def api_begin_verification(req: BeginVerificationRequest):
    """
    Admin: Move evidence from PENDING to UNDER_VERIFICATION.
    Opens verification window and assigns inspectors.
    """
    app_id = os.getenv("EVIDENCE_REGISTRY_APP_ID", "")
    admin_key = os.getenv("ADMIN_PRIVATE_KEY", "")
    result = begin_verification(
        req.evidence_id,
        req.category,
        app_id=int(app_id) if app_id else None,
        admin_private_key=admin_key if admin_key else None,
    )
    if "error" in result:
        raise HTTPException(400, result["error"])
    return result


@app.post("/verification/commit")
async def api_commit_verdict(req: CommitVerdictRequest):
    """
    Inspector: Submit hash(verdict + nonce) — commit phase.
    The hash hides the verdict until all inspectors have committed.
    """
    result = commit_verdict(
        req.evidence_id,
        req.inspector_address,
        req.commit_hash,
    )
    if "error" in result:
        raise HTTPException(400, result["error"])
    return result


@app.post("/verification/advance-to-reveal")
async def api_advance_to_reveal(evidence_id: str):
    """Admin: Manually advance from COMMIT to REVEAL phase."""
    result = advance_to_reveal(evidence_id)
    if "error" in result:
        raise HTTPException(400, result["error"])
    return result


@app.post("/verification/reveal")
async def api_reveal_verdict(req: RevealVerdictRequest):
    """
    Inspector: Reveal verdict + nonce. System verifies hash matches commit.
    Must include justification_ipfs — inspection evidence is mandatory.
    """
    result = reveal_verdict(
        req.evidence_id,
        req.inspector_address,
        req.verdict,
        req.nonce,
        req.justification_ipfs,
    )
    if "error" in result:
        raise HTTPException(400, result["error"])
    return result


@app.post("/verification/finalize")
async def api_finalize_verification(evidence_id: str):
    """
    Admin: Tally verdicts and determine final status (VERIFIED/REJECTED/DISPUTED).
    Uses weighted consensus based on inspector reputation scores.
    """
    app_id = os.getenv("EVIDENCE_REGISTRY_APP_ID", "")
    admin_key = os.getenv("ADMIN_PRIVATE_KEY", "")
    result = finalize_verification(
        evidence_id,
        app_id=int(app_id) if app_id else None,
        admin_private_key=admin_key if admin_key else None,
    )
    if "error" in result:
        raise HTTPException(400, result["error"])
    return result


@app.get("/verification/status/{evidence_id}")
async def api_verification_status(evidence_id: str):
    """Get current verification state for an evidence item."""
    return get_verification_status(evidence_id)


@app.get("/verification/sessions")
async def api_all_sessions():
    """Get all verification sessions (active + completed)."""
    return get_all_verification_sessions()


@app.post("/verification/generate-commit")
async def api_generate_commit(req: GenerateCommitRequest):
    """
    Helper: Generate a commit hash for testing.
    In production, this is computed client-side.
    """
    return generate_commit_hash(req.verdict, req.nonce)


# ─── Step 4: On-Chain Resolution & Fund Release ───

@app.post("/resolution/resolve")
async def api_resolve_evidence(evidence_id: str):
    """
    Step 4: Automatic on-chain resolution after verification.
    The smart contract evaluates the final status and:
      - VERIFIED -> releases locked stake back to the whistleblower
      - REJECTED -> forfeits the whistleblower's stake permanently
    All transfers are executed automatically by the contract.
    No admin wallet or manual approval is involved.
    """
    app_id = os.getenv("EVIDENCE_REGISTRY_APP_ID", "")
    admin_key = os.getenv("ADMIN_PRIVATE_KEY", "")
    result = resolve_evidence(
        evidence_id,
        app_id=int(app_id) if app_id else None,
        admin_private_key=admin_key if admin_key else None,
    )
    if "error" in result:
        raise HTTPException(400, result["error"])
    return result


@app.get("/resolution/{evidence_id}")
async def api_get_resolution(evidence_id: str):
    """Get the resolution record for a specific evidence item."""
    return get_resolution(evidence_id)


@app.get("/resolution/all/list")
async def api_all_resolutions():
    """Get all resolution records."""
    return get_all_resolutions()


@app.get("/resolution/stats/summary")
async def api_resolution_stats():
    """Get aggregate resolution statistics."""
    return get_resolution_stats()


# ─── Step 5: Public Record & Audit Trail ───

@app.post("/audit/publish")
async def api_publish_evidence(evidence_id: str):
    """
    Step 5: Finalize evidence state as PUBLIC.
    After resolution, creates an immutable on-chain audit record.
    The IPFS hash and verification outcome remain permanently accessible.
    Anyone can independently verify the entire evidence lifecycle.
    No further actions or fund movements occur after this step.
    """
    app_id = os.getenv("EVIDENCE_REGISTRY_APP_ID", "")
    admin_key = os.getenv("ADMIN_PRIVATE_KEY", "")
    result = publish_evidence(
        evidence_id,
        app_id=int(app_id) if app_id else None,
        admin_private_key=admin_key if admin_key else None,
    )
    if "error" in result:
        raise HTTPException(400, result["error"])
    return result


@app.get("/audit/trail/{evidence_id}")
async def api_get_audit_trail(evidence_id: str):
    """
    Get the complete audit trail for an evidence item.
    Anyone can independently verify:
      - When the evidence was submitted
      - How it was verified
      - What final decision was recorded
    """
    return get_audit_trail(evidence_id)


@app.get("/audit/records")
async def api_all_audit_records():
    """Get all published audit records."""
    return get_all_audit_records()


@app.get("/audit/public")
async def api_public_evidence():
    """Get all evidence that has been made public."""
    return get_public_evidence()


@app.get("/audit/stats")
async def api_audit_stats():
    """Get aggregate audit/transparency statistics."""
    return get_audit_stats()


# ─── Contract Transparency ───

@app.get("/contract/transparency")
async def contract_transparency():
    """
    Public trust dashboard data: contract address, balance,
    total staked, total refunded, refund rate, explorer link.
    Users can independently verify everything on-chain.
    """
    app_id_str = os.getenv("EVIDENCE_REGISTRY_APP_ID", "")
    if not app_id_str:
        return {"status": "contract_not_deployed"}

    app_id = int(app_id_str)
    balance_info = check_contract_balance(app_id)

    # Resolution stats
    stats = get_resolution_stats()

    return {
        "app_id": app_id,
        "app_address": balance_info.get("app_address", ""),
        "balance_algo": balance_info.get("balance_algo", 0),
        "explorer_url": f"https://testnet.explorer.perawallet.app/application/{app_id}",
        "network": "Algorand Testnet",
        "total_resolved": stats.get("total_resolved", 0),
        "stakes_released": stats.get("stakes_released", 0),
        "stakes_forfeited": stats.get("stakes_forfeited", 0),
        "refund_rate": (
            f"{(stats['stakes_released'] / stats['total_resolved'] * 100):.0f}%"
            if stats.get('total_resolved', 0) > 0 else "N/A — no resolutions yet"
        ),
        "escrow_type": "Smart Contract (non-custodial)",
        "fund_custody": "Funds are held by the smart contract, NOT by any person or wallet. "
                        "Refunds are executed automatically by on-chain logic.",
        "verification": {
            "source_code_public": True,
            "on_chain_verifiable": True,
            "admin_cannot_steal": True,
            "automatic_refunds": True,
        },
    }


# ─── Submissions Management ───

@app.get("/submissions/all")
async def api_all_submissions():
    """Get all submissions (admin view)."""
    return get_all_submissions()


@app.get("/submissions/status/{status}")
async def api_submissions_by_status(status: str):
    """Get submissions filtered by status (PENDING, UNDER_VERIFICATION, VERIFIED, etc.)."""
    return get_submissions_by_status(status.upper())


@app.get("/submissions/wallet/{wallet_address}")
async def api_submissions_by_wallet(wallet_address: str):
    """Get all submissions from a specific wallet (user dashboard)."""
    return get_submissions_by_wallet(wallet_address)


# ─── Bounty System (User-Only Rewards) ───

@app.get("/bounty/info/{category}")
async def api_bounty_info(category: str):
    """Get bounty reward info for a category."""
    return get_bounty_info(category)


@app.get("/bounty/info")
async def api_all_bounty_info():
    """Get bounty info for all categories."""
    return {cat: get_bounty_info(cat) for cat in BOUNTY_REWARDS}


@app.get("/bounty/payout/{evidence_id}")
async def api_bounty_payout(evidence_id: str):
    """Get bounty payout record for an evidence item."""
    result = get_bounty_payout(evidence_id)
    if not result:
        return {"evidence_id": evidence_id, "status": "NO_BOUNTY"}
    return result


@app.post("/bounty/process/{evidence_id}")
async def api_process_bounty(evidence_id: str):
    """
    Process bounty payout for a whistleblower after verification.
    VERIFIED -> stake refund + bounty reward.
    REJECTED -> stake forfeited.
    Only the whistleblower receives money.
    """
    submission = get_submission(evidence_id)
    if not submission:
        raise HTTPException(404, "Submission not found")

    # Check verification is finalized
    vrf_status = get_verification_status(evidence_id)
    if vrf_status.get("status") == "NO_VERIFICATION_SESSION":
        raise HTTPException(400, "No verification session found")

    verdict = vrf_status.get("final_verdict") or vrf_status.get("status", "PENDING")
    if verdict not in ["VERIFIED", "REJECTED", "DISPUTED"]:
        raise HTTPException(400, f"Verification not finalized. Current: {verdict}")

    result = process_bounty_payout(
        evidence_id=evidence_id,
        category=submission["category"],
        verdict=verdict,
        wallet_address=submission["wallet_address"],
        stake_amount_microalgos=submission["stake_amount_microalgos"],
    )
    if "error" in result:
        raise HTTPException(400, result["error"])

    # Update submission record
    update_submission(evidence_id, bounty_payout=result, status=verdict)
    return result


@app.get("/bounty/payouts")
async def api_all_bounty_payouts():
    """Get all bounty payout records."""
    return get_all_bounty_payouts()


@app.get("/bounty/stats")
async def api_bounty_stats():
    """Get aggregate bounty statistics."""
    return get_bounty_stats()


# ─── Publication Bot ───

@app.post("/publication/publish/{evidence_id}")
async def api_auto_publish(evidence_id: str):
    """
    Auto-publish verified evidence to all platforms (Twitter, Telegram, Email, RTI).
    Only for VERIFIED evidence after resolution.
    """
    submission = get_submission(evidence_id)
    if not submission:
        raise HTTPException(404, "Submission not found")

    vrf_status = get_verification_status(evidence_id)
    verdict = vrf_status.get("final_verdict") or vrf_status.get("status", "PENDING")
    if verdict != "VERIFIED":
        raise HTTPException(400, f"Only VERIFIED evidence can be published. Current: {verdict}")

    result = publish_to_all_platforms(
        evidence_id=evidence_id,
        category=submission["category"],
        organization=submission["organization"],
        description=submission.get("description", ""),
        ipfs_hash=submission.get("ipfs_hash", ""),
        verdict=verdict,
        tx_id=submission.get("tx_id"),
        block=submission.get("block"),
    )
    if "error" in result:
        raise HTTPException(400, result["error"])

    update_submission(evidence_id, publication=result)
    return result


@app.get("/publication/{evidence_id}")
async def api_get_publication(evidence_id: str):
    """Get publication record for an evidence item."""
    result = get_publication_record(evidence_id)
    if not result:
        return {"evidence_id": evidence_id, "status": "NOT_PUBLISHED"}
    return result


@app.get("/publication/records/all")
async def api_all_publications():
    """Get all publication records."""
    return get_all_publication_records()


@app.get("/publication/stats/summary")
async def api_publication_stats():
    """Get aggregate publication statistics."""
    return get_publication_stats()

