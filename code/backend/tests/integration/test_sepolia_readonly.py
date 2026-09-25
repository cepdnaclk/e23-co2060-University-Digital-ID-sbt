import os

import pytest


RUN_SEPOLIA = os.getenv("RUN_SEPOLIA_TESTS") == "1"


# --------------------------------------------------
# IMPORTANT:
# Skip this entire module BEFORE importing the real
# blockchain service during normal unit test runs.
# --------------------------------------------------

if not RUN_SEPOLIA:
    pytest.skip(
        "Live Sepolia tests disabled. "
        "Set RUN_SEPOLIA_TESTS=1 to enable them.",
        allow_module_level=True,
    )


# Only imported when live Sepolia testing is enabled.
from web3 import Web3

from app.blockchain.contract_service import (
    w3,
    admin_address,
    manager_contract,
    PERASOUL_ADDRESS,
    get_manager_owner,
)


pytestmark = pytest.mark.sepolia


def test_rpc_is_connected():
    assert w3.is_connected() is True


def test_connected_network_is_sepolia():
    assert w3.eth.chain_id == 11155111


def test_manager_contract_exists_on_chain():
    code = w3.eth.get_code(
        manager_contract.address
    )

    assert code not in (
        b"",
        b"\x00",
    )


def test_perasoul_contract_exists_on_chain():
    code = w3.eth.get_code(
        Web3.to_checksum_address(
            PERASOUL_ADDRESS
        )
    )

    assert code not in (
        b"",
        b"\x00",
    )


def test_manager_points_to_perasoul_contract():
    on_chain_address = (
        manager_contract.functions
        .peraSoul()
        .call()
    )

    assert Web3.to_checksum_address(
        on_chain_address
    ) == Web3.to_checksum_address(
        PERASOUL_ADDRESS
    )


def test_manager_owner_can_be_read():
    owner = get_manager_owner()

    assert Web3.is_address(owner)


def test_configured_admin_is_manager_owner():
    owner = get_manager_owner()

    assert Web3.to_checksum_address(
        owner
    ) == Web3.to_checksum_address(
        admin_address
    )


def test_admin_wallet_balance_can_be_read():
    balance = w3.eth.get_balance(
        admin_address
    )

    assert balance >= 0