"""
WhistleChain — Step 1 Demo Runner
===================================
Interactive CLI to demonstrate the full evidence submission flow:

  1. Generate anonymous wallet
  2. Encrypt evidence files (AES-256-GCM)
  3. Upload to IPFS via Pinata
  4. Anchor on Algorand blockchain
  5. Get Evidence ID + PENDING status

Usage:
    cd D:\\Hackathon\\RIFT2\\whistlechain
    .\\venv\\Scripts\\Activate.ps1
    python run_step1_demo.py
"""

import os
import sys
import json
import time
import tempfile

# Add project paths
sys.path.insert(0, os.path.dirname(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "smart-contracts"))

from dotenv import load_dotenv

load_dotenv()

from backend.services.wallet import create_anonymous_wallet
from backend.services.encryption import (
    generate_encryption_key,
    encrypt_files_to_bundle,
    decrypt_bundle,
    key_to_hex,
    key_from_hex,
)
from backend.services.ipfs_upload import upload_bytes_to_ipfs, get_ipfs_url
from backend.services.algorand_client import get_algod_client, check_connection


def create_sample_evidence_files() -> list[str]:
    """Create sample evidence files for demo purposes."""
    tmp_dir = tempfile.mkdtemp(prefix="whistlechain_demo_")

    # Sample invoice document
    invoice_path = os.path.join(tmp_dir, "fake_invoice.txt")
    with open(invoice_path, "w", encoding="utf-8") as f:
        f.write("""
INVOICE — ABC Construction Ltd
================================
Invoice No: INV-2025-4521
Date: 15 Jan 2026
To: Public Works Department, Government of India

Contract: PWD/2025/ROAD/12345
Description: Supply of Portland Cement (Grade 53)

Quantity: 50,000 bags
Rate: ₹200/bag
Total Billed: ₹10,00,00,000 (Ten Crore)

Bank Details: XYZ Bank, Account: 1234567890
================================
NOTE: Government procurement portal shows approved amount
      of only ₹4,50,00,000 (Four Crore Fifty Lakh).
      DISCREPANCY: ₹5,50,00,000 (122% inflation)
""")

    # Sample email evidence
    email_path = os.path.join(tmp_dir, "internal_email.txt")
    with open(email_path, "w", encoding="utf-8") as f:
        f.write("""
From: contractor@abcconstruction.com
To: procurement@abcconstruction.com
Date: 10 Jan 2026
Subject: RE: Invoice adjustment

Please update invoice INV-2025-4521 to reflect ₹10 crore
instead of the actual supply cost of ₹4 crore.
The difference will be handled through the usual channel.

Do NOT send this over official email next time.
""")

    # Sample approval document
    approval_path = os.path.join(tmp_dir, "govt_approval.txt")
    with open(approval_path, "w", encoding="utf-8") as f:
        f.write("""
GOVERNMENT OF INDIA
PUBLIC WORKS DEPARTMENT
========================
Contract Approval Notice

Contract ID: PWD/2025/ROAD/12345
Contractor: ABC Construction Ltd
Approved Amount: ₹4,50,00,000 (Four Crore Fifty Lakh)
Approval Date: 01 Dec 2025
Approved By: Chief Engineer, PWD

This document is system-generated from e-Procurement portal.
""")

    return [invoice_path, email_path, approval_path]


def run_demo():
    """Run the complete Step 1 demo."""
    print()
    print("╔" + "═" * 58 + "╗")
    print("║   WhistleChain — Step 1: Evidence Submission Demo        ║")
    print("║   Decentralized Whistleblower Protection Protocol        ║")
    print("╚" + "═" * 58 + "╝")

    # ──────────────────────────────────────────────
    # PHASE 1: Algorand Connection Check
    # ──────────────────────────────────────────────
    print("\n━━━ Phase 1: Algorand Network Connection ━━━")
    try:
        status = check_connection()
        print(f"  ✅ Connected to Algorand {status['network']}")
        print(f"  Last round: {status['last_round']}")
    except Exception as e:
        print(f"  ⚠️  Could not connect to Algorand: {e}")
        print(f"  (Continuing with IPFS-only demo...)")

    # ──────────────────────────────────────────────
    # PHASE 2: Anonymous Wallet Creation
    # ──────────────────────────────────────────────
    print("\n━━━ Phase 2: Anonymous Wallet Creation ━━━")
    wallet = create_anonymous_wallet()
    print(f"  ✅ Anonymous wallet generated!")
    print(f"  Address  : {wallet['address']}")
    print(f"  Mnemonic : {wallet['mnemonic'][:40]}...")
    print(f"  🔒 No KYC. No email. No identity linked.")

    # ──────────────────────────────────────────────
    # PHASE 3: Create Sample Evidence
    # ──────────────────────────────────────────────
    print("\n━━━ Phase 3: Evidence Files ━━━")
    sample_files = create_sample_evidence_files()
    for fp in sample_files:
        size = os.path.getsize(fp) / 1024
        print(f"  📄 {os.path.basename(fp)} ({size:.1f} KB)")

    # ──────────────────────────────────────────────
    # PHASE 4: AES-256-GCM Encryption
    # ──────────────────────────────────────────────
    print("\n━━━ Phase 4: AES-256-GCM Encryption ━━━")
    encryption_key = generate_encryption_key()
    key_hex = key_to_hex(encryption_key)

    encrypted_bundle = encrypt_files_to_bundle(sample_files, encryption_key)
    print(f"  ✅ {len(sample_files)} files encrypted")
    print(f"  Bundle size: {len(encrypted_bundle)} bytes")
    print(f"  Encryption key: {key_hex[:16]}...{key_hex[-8:]}")

    # Verify decryption works
    decrypted = decrypt_bundle(encrypted_bundle, encryption_key)
    assert len(decrypted) == len(sample_files), "Decryption verification failed!"
    print(f"  ✅ Decryption verified — {len(decrypted)} files recovered")

    # ──────────────────────────────────────────────
    # PHASE 5: IPFS Upload via Pinata
    # ──────────────────────────────────────────────
    print("\n━━━ Phase 5: IPFS Upload via Pinata ━━━")
    ipfs_hash = None
    pinata_jwt = os.getenv("PINATA_JWT", "")

    if pinata_jwt and not pinata_jwt.startswith("your_"):
        try:
            ipfs_result = upload_bytes_to_ipfs(
                encrypted_bundle,
                filename=f"whistlechain_evidence_{int(time.time())}.json",
            )
            ipfs_hash = ipfs_result["IpfsHash"]
            print(f"  ✅ Uploaded to IPFS!")
            print(f"  CID      : {ipfs_hash}")
            print(f"  URL      : {get_ipfs_url(ipfs_hash)}")
            print(f"  Pin Size : {ipfs_result.get('PinSize', 'N/A')} bytes")
        except Exception as e:
            print(f"  ❌ IPFS upload failed: {e}")
            ipfs_hash = f"QmDEMO_{int(time.time())}_SIMULATED"
            print(f"  Using simulated hash: {ipfs_hash}")
    else:
        ipfs_hash = f"QmDEMO_{int(time.time())}_SIMULATED"
        print(f"  ⚠️  PINATA_JWT not configured. Using simulated hash.")
        print(f"  Simulated CID: {ipfs_hash}")

    # ──────────────────────────────────────────────
    # PHASE 6: On-Chain Anchoring (Algorand)
    # ──────────────────────────────────────────────
    print("\n━━━ Phase 6: Algorand On-Chain Anchoring ━━━")

    app_id = os.getenv("EVIDENCE_REGISTRY_APP_ID", "")
    deployer_mnemonic = os.getenv("DEPLOYER_MNEMONIC", "")

    evidence_id = f"EVD-{time.strftime('%Y')}-00001"
    tx_id = None
    block_number = None

    if app_id and deployer_mnemonic and not deployer_mnemonic.startswith("word1"):
        try:
            from backend.submit_evidence import submit_evidence

            result = submit_evidence(
                file_paths=sample_files,
                category="FINANCIAL",
                organization="ABC Construction Ltd",
                description="Invoice inflation of 122% on cement supply contract PWD/2025/ROAD/12345",
                wallet_mnemonic=wallet["mnemonic"],
                app_id=int(app_id),
            )
            evidence_id = result["evidence_id"]
            tx_id = result["tx_id"]
            block_number = result["block"]
        except Exception as e:
            print(f"  ⚠️  On-chain submission failed: {e}")
            print(f"  (This is expected if the contract isn't deployed yet)")
            print(f"  Simulating on-chain anchoring...")
    else:
        print(f"  ⚠️  Contract not deployed yet (EVIDENCE_REGISTRY_APP_ID not set)")
        print(f"  Simulating on-chain anchoring for demo...")

    if not tx_id:
        # Simulate for demo purposes
        tx_id = f"DEMO_TX_{int(time.time())}"
        block_number = 45_234_892
        print(f"  📝 Simulated transaction: {tx_id}")
        print(f"  📦 Simulated block: #{block_number}")

    # ──────────────────────────────────────────────
    # PHASE 7: Final Summary
    # ──────────────────────────────────────────────
    timestamp_str = time.strftime("%d %b %Y %H:%M IST")

    print()
    print("╔" + "═" * 58 + "╗")
    print("║   ✅ EVIDENCE SUBMITTED SUCCESSFULLY                     ║")
    print("╠" + "═" * 58 + "╣")
    print(f"║  Evidence ID   : {evidence_id:<39}║")
    print(f"║  IPFS Hash     : {str(ipfs_hash)[:39]:<39}║")
    print(f"║  Transaction   : {str(tx_id)[:39]:<39}║")
    print(f"║  Block          : #{str(block_number):<37}║")
    print(f"║  Timestamp     : {timestamp_str:<39}║")
    print(f"║  Status        : {'PENDING':<39}║")
    print(f"║  Category      : {'FINANCIAL':<39}║")
    print(f"║  Organization  : {'ABC Construction Ltd':<39}║")
    print("╠" + "═" * 58 + "╣")
    print(f"║  🔒 Identity: Never stored anywhere                     ║")
    print(f"║  🔑 Enc Key : {key_hex[:24]}...    ║")
    print(f"║  💼 Wallet  : {wallet['address'][:24]}...    ║")
    print("╚" + "═" * 58 + "╝")

    # Save results to file
    results = {
        "evidence_id": evidence_id,
        "ipfs_hash": ipfs_hash,
        "ipfs_url": get_ipfs_url(ipfs_hash) if ipfs_hash else None,
        "tx_id": tx_id,
        "block": block_number,
        "timestamp": timestamp_str,
        "status": "PENDING",
        "category": "FINANCIAL",
        "organization": "ABC Construction Ltd",
        "description": "Invoice inflation of 122% on cement supply contract PWD/2025/ROAD/12345",
        "wallet_address": wallet["address"],
        "encryption_key_hex": key_hex,
    }

    output_path = os.path.join(os.path.dirname(__file__), "demo_submission_result.json")
    with open(output_path, "w") as f:
        json.dump(results, f, indent=2)

    print(f"\n  📁 Full results saved to: demo_submission_result.json")

    # Cleanup temp files
    for fp in sample_files:
        try:
            os.unlink(fp)
        except OSError:
            pass

    return results


if __name__ == "__main__":
    run_demo()
