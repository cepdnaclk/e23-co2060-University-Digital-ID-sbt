import json
import os
from pathlib import Path

from dotenv import load_dotenv
from web3 import Web3


load_dotenv()

RPC_URL = os.getenv("RPC_URL")
ADMIN_PRIVATE_KEY = os.getenv("ADMIN_PRIVATE_KEY")
MANAGER_ADDRESS = os.getenv("MANAGER_ADDRESS")

if not RPC_URL:
    raise RuntimeError("RPC_URL is not configured.")

if not ADMIN_PRIVATE_KEY:
    raise RuntimeError("ADMIN_PRIVATE_KEY is not configured.")

if not MANAGER_ADDRESS:
    raise RuntimeError("MANAGER_ADDRESS is not configured.")


w3 = Web3(Web3.HTTPProvider(RPC_URL))

if not w3.is_connected():
    raise RuntimeError("Unable to connect to Ethereum RPC.")


admin_account = w3.eth.account.from_key(ADMIN_PRIVATE_KEY)
admin_address = admin_account.address


# contract_service.py:
# code/backend/app/blockchain/contract_service.py
#
# parents[2] = code/backend
BACKEND_DIR = Path(__file__).resolve().parents[2]
ABI_DIR = BACKEND_DIR / "abi"


def load_abi(filename: str):
    path = ABI_DIR / filename

    with open(path, "r", encoding="utf-8") as file:
        artifact = json.load(file)

    # Supports both:
    # { "abi": [...] }
    # and a raw ABI list.
    if isinstance(artifact, dict):
        return artifact["abi"]

    return artifact


manager_abi = load_abi("PeraSoulManager.json")
perasoul_abi = [
    {
        "inputs": [
            {
                "internalType": "address",
                "name":"",
                "type": "address",
            }
        ],
        "name": "hasToken",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internal": "address",
                "name": "",
                "type": "address"
            }
        ],
        "name": "studentToken",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function" 
    }
]


manager_contract = w3.eth.contract(
    address=Web3.to_checksum_address(MANAGER_ADDRESS),
    abi=manager_abi,
)


PERASOUL_ADDRESS = manager_contract.functions.peraSoul().call()

perasoul_contract = w3.eth.contract(
    address=Web3.to_checksum_address(PERASOUL_ADDRESS),
    abi=perasoul_abi,
)


def _transaction_parameters(gas: int = 350000):
    nonce = w3.eth.get_transaction_count(
        admin_address,
        "pending",
    )

    latest_block = w3.eth.get_block("latest")

    base_fee = latest_block.get(
        "baseFeePerGas",
        w3.eth.gas_price,
    )

    max_priority_fee = w3.to_wei("3", "gwei")

    max_fee = (
        base_fee * 3
        + max_priority_fee
    )

    return {
        "from": admin_address,
        "nonce": nonce,
        "gas": gas,
        "maxFeePerGas": max_fee,
        "maxPriorityFeePerGas": max_priority_fee,
        "chainId": w3.eth.chain_id,
    }


def _send_transaction(contract_function, gas: int = 350000):
    transaction = contract_function.build_transaction(
        _transaction_parameters(gas)
    )

    signed_tx = w3.eth.account.sign_transaction(
        transaction,
        private_key=ADMIN_PRIVATE_KEY,
    )

    tx_hash = w3.eth.send_raw_transaction(
        signed_tx.raw_transaction
    )

    receipt = w3.eth.wait_for_transaction_receipt(
        tx_hash,
        timeout=300,
        poll_latency=2,
    )

    if receipt.status != 1:
        raise RuntimeError(
            f"Blockchain transaction failed: {tx_hash.hex()}"
        )

    return {
        "tx_hash": tx_hash.hex(),
        "block_number": receipt.blockNumber,
        "gas_used": receipt.gasUsed,
        "status": receipt.status,
    }


# --------------------------------------------------
# BASIC READ OPERATIONS
# --------------------------------------------------

def get_manager_owner() -> str:
    return manager_contract.functions.owner().call()


def student_has_token(student_wallet: str) -> bool:
    student_wallet = Web3.to_checksum_address(
        student_wallet
    )

    return perasoul_contract.functions.hasToken(
        student_wallet
    ).call()


def get_student_token_id(student_wallet: str) -> int:
    student_wallet = Web3.to_checksum_address(
        student_wallet
    )

    if not student_has_token(student_wallet):
        raise ValueError("Student does not have a token.")

    return perasoul_contract.functions.studentToken(
        student_wallet
    ).call()


def verify_student_on_chain(student_wallet: str) -> bool:
    student_wallet = Web3.to_checksum_address(
        student_wallet
    )

    return manager_contract.functions.verifyStudent(
        student_wallet
    ).call()


def is_permanently_revoked(token_id: int) -> bool:
    return manager_contract.functions.permanentlyRevoked(
        token_id
    ).call()


def get_temporary_revocation_until(token_id: int) -> int:
    return manager_contract.functions.temporarilyRevokedUntil(
        token_id
    ).call()


def get_current_block_timestamp() -> int:
    latest_block = w3.eth.get_block("latest")
    return latest_block["timestamp"]


def get_remaining_revocation_time(
    student_wallet: str
) -> int:

    student_wallet = Web3.to_checksum_address(
        student_wallet
    )

    return manager_contract.functions.getRemainingRevocationTime(
        student_wallet
    ).call()


# --------------------------------------------------
# MINT
# --------------------------------------------------

def mint_student_token(student_wallet: str):
    student_wallet = Web3.to_checksum_address(
        student_wallet
    )

    result = _send_transaction(
        manager_contract.functions.mintStudentToken(
            student_wallet
        )
    )

    result["token_id"] = get_student_token_id(
        student_wallet
    )

    return result


# --------------------------------------------------
# TEMPORARY REVOCATION
# --------------------------------------------------

def revoke_student_temporarily(
    student_wallet: str,
    duration_seconds: int,
):
    student_wallet = Web3.to_checksum_address(
        student_wallet
    )

    if duration_seconds <= 0:
        raise ValueError(
            "Temporary revocation duration must be greater than zero."
        )

    return _send_transaction(
        manager_contract.functions.revokeTemporarily(
            student_wallet,
            duration_seconds,
        )
    )


# --------------------------------------------------
# PERMANENT REVOCATION
# --------------------------------------------------

def revoke_student_permanently(
    student_wallet: str
):
    student_wallet = Web3.to_checksum_address(
        student_wallet
    )

    if not student_has_token(student_wallet):
        raise ValueError(
            "Student does not have an active token."
        )

    # Save token ID BEFORE burning.
    token_id = get_student_token_id(
        student_wallet
    )

    result = _send_transaction(
        manager_contract.functions.revokePermanently(
            student_wallet
        )
    )

    result["token_id"] = token_id

    return result


# --------------------------------------------------
# WALLET REPLACEMENT
# --------------------------------------------------

def replace_student_wallet(
    old_wallet: str,
    new_wallet: str,
):
    old_wallet = Web3.to_checksum_address(
        old_wallet
    )

    new_wallet = Web3.to_checksum_address(
        new_wallet
    )

    if old_wallet == new_wallet:
        raise ValueError(
            "Old wallet and new wallet cannot be the same."
        )

    if not student_has_token(old_wallet):
        raise ValueError(
            "Old wallet does not have an active token."
        )

    if student_has_token(new_wallet):
        raise ValueError(
            "New wallet already owns a PeraSoul token."
        )

    old_token_id = get_student_token_id(
        old_wallet
    )

    result = _send_transaction(
        manager_contract.functions.replaceStudentWallet(
            old_wallet,
            new_wallet,
        ),
        gas=450000,
    )

    new_token_id = get_student_token_id(
        new_wallet
    )

    result["old_token_id"] = old_token_id
    result["new_token_id"] = new_token_id

    return result

def load_abi(filename: str):

    path = ABI_DIR / filename

    with open(
        path,
        "r",
        encoding="utf-8"
    ) as file:

        artifact = json.load(file)

    if isinstance(
        artifact,
        dict
    ):

        return artifact["abi"]

    return artifact


manager_abi = load_abi(
    "PeraSoulManager.json"
)


# Minimal ABI required from PeraSoul.

perasoul_abi = [

    {
        "inputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "name": "hasToken",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },

    {
        "inputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "name": "studentToken",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }

]


manager_contract = w3.eth.contract(

    address=
        Web3.to_checksum_address(
            MANAGER_ADDRESS
        ),

    abi=
        manager_abi

)


PERASOUL_ADDRESS = (
    manager_contract
    .functions
    .peraSoul()
    .call()
)


perasoul_contract = w3.eth.contract(

    address=
        Web3.to_checksum_address(
            PERASOUL_ADDRESS
        ),

    abi=
        perasoul_abi

)