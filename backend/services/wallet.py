"""
WhistleChain — Anonymous Wallet Generator
==========================================
Generates Algorand wallets for whistleblowers — no KYC, no
email, no identity. Just a private key + public address.
"""

from algosdk import account, mnemonic


def create_anonymous_wallet() -> dict:
    """
    Generate a fresh Algorand keypair for anonymous whistleblowing.

    Returns:
        {
            "address":    "ALGO3X7Y...ZZZ",    # public address
            "private_key": "base64-encoded...", # signing key (KEEP SECRET)
            "mnemonic":   "word1 word2 ... word25"  # 25-word backup (KEEP SECRET)
        }
    """
    private_key, address = account.generate_account()
    passphrase = mnemonic.from_private_key(private_key)

    return {
        "address": address,
        "private_key": private_key,
        "mnemonic": passphrase,
    }


def wallet_from_mnemonic(passphrase: str) -> dict:
    """
    Restore a wallet from a 25-word mnemonic.

    Args:
        passphrase: 25-word Algorand mnemonic.

    Returns:
        Same dict as create_anonymous_wallet.
    """
    private_key = mnemonic.to_private_key(passphrase)
    address = account.address_from_private_key(private_key)

    return {
        "address": address,
        "private_key": private_key,
        "mnemonic": passphrase,
    }


def get_address_from_private_key(private_key: str) -> str:
    """Get the Algorand address for a given private key."""
    return account.address_from_private_key(private_key)
