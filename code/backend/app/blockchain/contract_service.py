import json 
import os 
from web3 import Web3
from dotenv import load_dotenv

load_dotenv()

RPC_URL = os.getenv("RPC_URL")
ADMIN_PRIVATE_KEY = os.getenv("ADMIN_PRIVATE_KEY")
MANAGER_ADDRESS = os.getenv("MANAGER_ADDRESS")

w3 =Web3(Web3.HTTPProvider(RPC_URL))

admin_account = w3.eth.account.from_key(ADMIN_PRIVATE_KEY)
admin_address = admin_account.address 

with open("abi/PeraSoulManager.json", "r") as file:
    artifact = json.load(file)

    manager_abi = artifact["abi"]

manager_contract = w3.eth.contract (
    address = Web3.to_checksum_address(MANAGER_ADDRESS),
    abi = manager_abi
)

def mint_student_token(student_wallet: str):
    student_wallet = Web3.to_checksum_address(student_wallet)

    # Use pending nonce to avoid nonce conflicts with pending transactions
    nonce = w3.eth.get_transaction_count(admin_address, "pending")

    # EIP-1559 gas settings
    latest_block = w3.eth.get_block("latest")
    base_fee = latest_block.get("baseFeePerGas", w3.eth.gas_price)

    max_priority_fee = w3.to_wei("3", "gwei")
    max_fee = base_fee * 3 + max_priority_fee

    transaction = manager_contract.functions.mintStudentToken(
        student_wallet
    ).build_transaction({
        "from": admin_address,
        "nonce": nonce,
        "gas": 300000,
        "maxFeePerGas": max_fee,
        "maxPriorityFeePerGas": max_priority_fee,
    })

    signed_tx = w3.eth.account.sign_transaction(
        transaction,
        private_key=ADMIN_PRIVATE_KEY
    )

    tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)

    print("Transaction sent:", tx_hash.hex())

    receipt = w3.eth.wait_for_transaction_receipt(
        tx_hash,
        timeout=300,
        poll_latency=2
    )

    return {
        "tx_hash": tx_hash.hex(),
        "block_number": receipt.blockNumber,
        "gas_used": receipt.gasUsed,
        "status": receipt.status
    }

def student_has_token(student_wallet: str) -> bool:
    student_wallet = Web3.to_checksum_address(student_wallet)

    return manager_contract.functions.peraSoul().call() is not None 

def verify_student_on_chain(student_wallet:str) -> bool:
    student_wallet = Web3.to_checksum_address(student_wallet)

    return manager_contract.functions.verifyStudent(student_wallet).call()

def revoke_student_temporarily(student_wallet: str, duration_seconds: int):
    student_wallet = Web3.to_checksum_address(student_wallet) 

    nonce = w3.eth.get_transaction_count(admin_address, "pending")

    latest_block = w3.eth.get_block("latest")
    base_fee = latest_block.get("baseFeePerGas", w3.eth.gas_price)
    max_priority_fee = w3.to_wei("3", "gwei")
    max_fee = base_fee * 3 + max_priority_fee

    transaction = manager_contract.functions.revokeTemporarily(
        student_wallet,
        duration_seconds
    ).build_transaction( {
        "from": admin_address,
        "nonce": nonce,
        "gas": 300000,
        "maxFeePerGas": max_fee,
        "maxPriorityFeePerGas": max_priority_fee,
    })

    signed_tx = w3.eth.account.sign_transaction(
        transaction,
        private_key = ADMIN_PRIVATE_KEY
    )

    tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)

    receipt = w3.eth.wait_for_transaction_receipt(
        tx_hash,
        timeout = 300,
        poll_latency = 2
    )

    return {
        "tx_hash": tx_hash.hex(),
        "block_number": receipt.blockNumber,
        "gas_used": receipt.gasUsed,
        "status": receipt.status
    }

def get_remaining_revocation_time(student_wallet: str) -> int:
    student_wallet = Web3.to_checksum_address(student_wallet)

    return manager_contract.functions.getRemainingRevocationTime(
        student_wallet
    ).call()
