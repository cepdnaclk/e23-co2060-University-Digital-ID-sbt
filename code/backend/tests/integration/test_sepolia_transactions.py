import os

import pytest
from eth_account import Account

RUN_TX_TESTS = (
    os.getenv("RUN_SEPOLIA_TX_TESTS") == "1"
)

if not RUN_TX_TESTS:
    pytest.skip(
        "Live Sepolia transaction tests disabled. "
        "Set RUN_SEPOLIA_TX_TESTS=1 to enable them.",
        allow_module_level=True,
    )

from app.blockchain.contract_service import (
    w3,
    admin_address,
    mint_student_token,
    student_has_token,
    get_student_token_id,
    verify_student_on_chain,
    get_remaining_revocation_time,
    revoke_student_temporarily,
    revoke_student_permanently,
    replace_student_wallet,
)

pytestmark = pytest.mark.sepolia_tx


def fresh_wallet():
    return Account.create().address


def ensure_admin_has_test_eth():
    balance = w3.eth.get_balance(admin_address)

    if balance <= 0:
        pytest.skip(
            "Admin wallet has no Sepolia ETH."
        )


def test_real_mint_verify_revoke_lifecycle():
    ensure_admin_has_test_eth()

    student_wallet = fresh_wallet()
    minted = False

    try:
        # -----------------------------
        # Mint
        # -----------------------------
        result = mint_student_token(
            student_wallet
        )

        minted = True

        assert result["status"] == 1
        assert result["tx_hash"]
        assert result["block_number"] > 0
        assert result["gas_used"] > 0

        # -----------------------------
        # Check token ownership
        # -----------------------------
        assert student_has_token(
            student_wallet
        ) is True

        token_id = get_student_token_id(
            student_wallet
        )

        assert token_id > 0

        # -----------------------------
        # Verify valid identity
        # -----------------------------
        assert verify_student_on_chain(
            student_wallet
        ) is True

        # -----------------------------
        # Temporary revocation
        # -----------------------------
        revoke_result = (
            revoke_student_temporarily(
                student_wallet,
                120,
            )
        )

        assert revoke_result["status"] == 1
        assert revoke_result["tx_hash"]

        # Identity must now be invalid
        assert verify_student_on_chain(
            student_wallet
        ) is False

        remaining = (
            get_remaining_revocation_time(
                student_wallet
            )
        )

        assert remaining > 0

        # -----------------------------
        # Permanent revocation
        # -----------------------------
        permanent_result = (
            revoke_student_permanently(
                student_wallet
            )
        )

        minted = False

        assert permanent_result["status"] == 1
        assert permanent_result["tx_hash"]
        assert permanent_result["token_id"] == token_id

        # -----------------------------
        # Final state
        # -----------------------------
        assert student_has_token(
            student_wallet
        ) is False

        assert verify_student_on_chain(
            student_wallet
        ) is False

        print()
        print("Lifecycle test evidence:")
        print(
            "Mint tx:",
            result["tx_hash"],
        )
        print(
            "Temporary revoke tx:",
            revoke_result["tx_hash"],
        )
        print(
            "Permanent revoke tx:",
            permanent_result["tx_hash"],
        )
        print(
            "Token ID:",
            token_id,
        )

    finally:
        # Cleanup if test fails after minting
        if minted:
            try:
                revoke_student_permanently(
                    student_wallet
                )
            except Exception:
                pass


def test_real_wallet_replacement():
    ensure_admin_has_test_eth()

    old_wallet = fresh_wallet()
    new_wallet = fresh_wallet()

    cleanup_wallet = None

    try:
        # -----------------------------
        # Mint to old wallet
        # -----------------------------
        mint_result = mint_student_token(
            old_wallet
        )

        assert mint_result["status"] == 1

        old_token_id = get_student_token_id(
            old_wallet
        )

        # -----------------------------
        # Replace wallet
        # -----------------------------
        replacement = replace_student_wallet(
            old_wallet,
            new_wallet,
        )

        cleanup_wallet = new_wallet

        assert replacement["status"] == 1

        assert (
            replacement["old_token_id"]
            == old_token_id
        )

        assert (
            replacement["new_token_id"]
            > old_token_id
        )

        # -----------------------------
        # Check old wallet
        # -----------------------------
        assert student_has_token(
            old_wallet
        ) is False

        assert verify_student_on_chain(
            old_wallet
        ) is False

        # -----------------------------
        # Check new wallet
        # -----------------------------
        assert student_has_token(
            new_wallet
        ) is True

        assert verify_student_on_chain(
            new_wallet
        ) is True

        # -----------------------------
        # Cleanup
        # -----------------------------
        cleanup_result = (
            revoke_student_permanently(
                new_wallet
            )
        )

        cleanup_wallet = None

        assert cleanup_result["status"] == 1

        print()
        print("Wallet replacement evidence:")
        print(
            "Mint tx:",
            mint_result["tx_hash"],
        )
        print(
            "Replacement tx:",
            replacement["tx_hash"],
        )
        print(
            "Cleanup revoke tx:",
            cleanup_result["tx_hash"],
        )
        print(
            "Old token ID:",
            replacement["old_token_id"],
        )
        print(
            "New token ID:",
            replacement["new_token_id"],
        )

    finally:
        if cleanup_wallet is not None:
            try:
                revoke_student_permanently(
                    cleanup_wallet
                )
            except Exception:
                pass