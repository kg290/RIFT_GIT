"""
WhistleChain — Deploy Evidence Registry to Algorand Testnet
============================================================
Uses AlgoKit as the primary development framework.
Compiles TEAL, creates the application via AlgoKit utils, and saves the App ID.

AlgoKit is Algorand's official development toolkit:
  https://developer.algorand.org/algokit/
"""

import os
import sys
import json
import base64

# Add project root AND smart-contracts directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from algosdk import transaction, account, mnemonic, encoding
from algosdk.v2client import algod
from algosdk.atomic_transaction_composer import AccountTransactionSigner
from dotenv import load_dotenv

# ─── AlgoKit Imports ───
import algokit_utils
from algokit_utils import (
    AlgorandClient,
    AlgoAmount,
    AppCreateParams,
    AppCreateSchema,
)

from contracts.evidence_registry import (
    get_approval_teal,
    get_clear_teal,
)

load_dotenv()


def get_algorand_client() -> AlgorandClient:
    """
    Create an AlgorandClient connected to Algorand Testnet via AlgoKit.
    Uses AlgoKit's built-in testnet() factory — the recommended approach.
    """
    return AlgorandClient.testnet()


def get_algod_client() -> algod.AlgodClient:
    """Create raw algod client for testnet (used for TEAL compilation)."""
    server = os.getenv("ALGOD_SERVER", "https://testnet-api.algonode.cloud")
    token = os.getenv("ALGOD_TOKEN", "")
    return algod.AlgodClient(token, server)


def compile_teal(client: algod.AlgodClient, source: str) -> bytes:
    """Compile TEAL source to bytecode."""
    result = client.compile(source)
    return base64.b64decode(result["result"])


def deploy_evidence_registry(
    algorand: AlgorandClient,
    deployer_private_key: str,
) -> int:
    """
    Deploy the Evidence Registry smart contract to Algorand Testnet
    using AlgoKit as the primary development framework.

    Uses AlgoKit's AlgorandClient for transaction composition, signing,
    and confirmation — the recommended approach per AlgoKit docs.

    Args:
        algorand: AlgoKit AlgorandClient instance.
        deployer_private_key: Private key of the deployer account.

    Returns:
        App ID of the deployed contract on Testnet.
    """
    deployer_address = account.address_from_private_key(deployer_private_key)

    print(f"  Deployer address : {deployer_address}")
    print(f"  Compiling TEAL via AlgoKit...")

    # Compile TEAL using the algod client from AlgoKit
    algod_client = algorand.client.algod
    approval_teal = get_approval_teal()
    clear_teal = get_clear_teal()

    approval_result = algod_client.compile(approval_teal)
    clear_result = algod_client.compile(clear_teal)
    approval_program = base64.b64decode(approval_result["result"])
    clear_program = base64.b64decode(clear_result["result"])

    print(f"  Approval program : {len(approval_program)} bytes")
    print(f"  Clear program    : {len(clear_program)} bytes")

    # Register deployer account with AlgoKit's AccountManager
    deployer_signer = AccountTransactionSigner(deployer_private_key)
    algorand.account.set_signer(sender=deployer_address, signer=deployer_signer)

    # Deploy using AlgoKit's transaction sender
    # AlgoKit handles suggested params, signing, sending, and confirmation
    result = algorand.send.app_create(
        AppCreateParams(
            sender=deployer_address,
            approval_program=approval_program,
            clear_state_program=clear_program,
            schema=AppCreateSchema(
                global_ints=4,        # evidence_counter, total_staked, total_forfeited, reserved
                global_byte_slices=2, # admin, reserved
                local_ints=0,
                local_byte_slices=0,
            ),
            extra_program_pages=1,
            note=b"WhistleChain Evidence Registry v3 - Deployed via AlgoKit",
        )
    )

    app_id = result.app_id

    print(f"  ✅ Evidence Registry deployed via AlgoKit!")
    print(f"  App ID           : {app_id}")
    print(f"  Transaction ID   : {result.tx_id}")
    print(f"  Confirmed round  : {result.confirmation['confirmed-round']}")

    return app_id


def fund_account_if_needed(algorand: AlgorandClient, address: str) -> None:
    """Check account balance using AlgoKit and warn if underfunded."""
    try:
        info = algorand.account.get_information(address)
        balance = info.amount  # AlgoAmount object
        balance_algo = float(balance.algo)
        print(f"  Account balance  : {balance_algo:.6f} ALGO")
        if balance.micro_algo < 1_000_000:  # less than 1 ALGO
            print(f"  ⚠️  Low balance! Fund your account at:")
            print(f"     https://bank.testnet.algorand.network/")
            print(f"     Address: {address}")
    except Exception as e:
        print(f"  ⚠️  Could not check balance: {e}")


def save_contract_id(app_id: int, contract_name: str = "evidence_registry") -> None:
    """Save deployed contract App ID to contract_ids.json."""
    ids_path = os.path.join(os.path.dirname(__file__), "contract_ids.json")

    # Load existing IDs
    if os.path.exists(ids_path):
        with open(ids_path, "r") as f:
            ids = json.load(f)
    else:
        ids = {}

    ids[contract_name] = {
        "app_id": app_id,
        "network": "testnet",
    }

    with open(ids_path, "w") as f:
        json.dump(ids, f, indent=2)

    print(f"  Saved to         : {ids_path}")


def main():
    print("=" * 60)
    print("  WhistleChain — Deploy Evidence Registry via AlgoKit")
    print("=" * 60)

    # Load deployer mnemonic
    deployer_mnemonic = os.getenv("DEPLOYER_MNEMONIC", "").strip()
    if not deployer_mnemonic or deployer_mnemonic.startswith("word1"):
        print("\n  ❌ DEPLOYER_MNEMONIC not set in .env")
        print("  Generate one with: python -c \"from algosdk import account, mnemonic; pk, addr = account.generate_account(); print(f'Address: {addr}'); print(f'Mnemonic: {mnemonic.from_private_key(pk)}')\"")
        print("  Then fund it at: https://bank.testnet.algorand.network/")
        sys.exit(1)

    deployer_pk = mnemonic.to_private_key(deployer_mnemonic)

    # Create AlgoKit AlgorandClient — the primary development framework
    print("\n  Initializing AlgoKit AlgorandClient...")
    algorand = get_algorand_client()

    # Check connection via AlgoKit
    print("  Connecting to Algorand Testnet via AlgoKit...")
    algod_client = algorand.client.algod
    status = algod_client.status()
    print(f"  Last round       : {status['last-round']}")
    print(f"  AlgoKit version  : {algokit_utils.__version__ if hasattr(algokit_utils, '__version__') else '4.x'}")

    # Check balance via AlgoKit
    deployer_addr = account.address_from_private_key(deployer_pk)
    fund_account_if_needed(algorand, deployer_addr)

    # Deploy via AlgoKit
    print("\n  Deploying Evidence Registry contract via AlgoKit...")
    app_id = deploy_evidence_registry(algorand, deployer_pk)

    # Save
    save_contract_id(app_id)

    # Update .env with the App ID
    env_path = os.path.join(os.path.dirname(__file__), "..", "..", ".env")
    update_env_app_id(env_path, app_id)

    print("\n" + "=" * 60)
    print(f"  🎉 Deployment complete via AlgoKit!")
    print(f"  App ID (Testnet): {app_id}")
    print(f"  Explorer: https://testnet.explorer.perawallet.app/application/{app_id}")
    print(f"  AlgoExplorer: https://testnet.algoexplorer.io/application/{app_id}")
    print("=" * 60)

    return app_id


def update_env_app_id(env_path: str, app_id: int) -> None:
    """Update .env file with the deployed App ID."""
    if not os.path.exists(env_path):
        return

    with open(env_path, "r") as f:
        content = f.read()

    # Replace or append EVIDENCE_REGISTRY_APP_ID
    if "EVIDENCE_REGISTRY_APP_ID" in content:
        import re
        content = re.sub(
            r"EVIDENCE_REGISTRY_APP_ID=.*",
            f"EVIDENCE_REGISTRY_APP_ID={app_id}",
            content,
        )
    else:
        content += f"\nEVIDENCE_REGISTRY_APP_ID={app_id}\n"

    with open(env_path, "w") as f:
        f.write(content)

    print(f"  Updated .env     : EVIDENCE_REGISTRY_APP_ID={app_id}")


if __name__ == "__main__":
    main()
