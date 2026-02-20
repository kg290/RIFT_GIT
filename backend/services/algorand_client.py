"""
WhistleChain — Algorand Client Configuration
=============================================
Shared Algorand client setup used by deployment, submission,
and oracle services.
"""

import os
from algosdk.v2client import algod, indexer
from dotenv import load_dotenv

load_dotenv()

# ─── Defaults: Algorand Testnet (free, no key) ───
DEFAULT_ALGOD_SERVER = "https://testnet-api.algonode.cloud"
DEFAULT_ALGOD_PORT = 443
DEFAULT_ALGOD_TOKEN = ""

DEFAULT_INDEXER_SERVER = "https://testnet-idx.algonode.cloud"
DEFAULT_INDEXER_PORT = 443
DEFAULT_INDEXER_TOKEN = ""


def get_algod_client() -> algod.AlgodClient:
    """Create and return an Algorand algod client for testnet."""
    server = os.getenv("ALGOD_SERVER", DEFAULT_ALGOD_SERVER)
    token = os.getenv("ALGOD_TOKEN", DEFAULT_ALGOD_TOKEN)
    port = os.getenv("ALGOD_PORT", str(DEFAULT_ALGOD_PORT))

    # AlgoNode doesn't need a token but the SDK requires the param
    return algod.AlgodClient(token, server)


def get_indexer_client() -> indexer.IndexerClient:
    """Create and return an Algorand indexer client for testnet."""
    server = os.getenv("INDEXER_SERVER", DEFAULT_INDEXER_SERVER)
    token = os.getenv("INDEXER_TOKEN", DEFAULT_INDEXER_TOKEN)

    return indexer.IndexerClient(token, server)


def check_connection() -> dict:
    """Verify algod is reachable and return node status."""
    client = get_algod_client()
    status = client.status()
    return {
        "last_round": status["last-round"],
        "last_version": status.get("last-version", ""),
        "network": "testnet",
        "catchup_time": status.get("catchup-time", 0),
    }
