from fastapi import APIRouter, HTTPException
from app.blockchain.contract_service import (
    verify_student_on_chain,
    get_remaining_revocation_time
)
from app.schemas import VerifyStudentResponse

router = APIRouter(prefix="/verify", tags=["Verification"])


def is_valid_wallet_address(wallet_address: str) -> bool:
    return wallet_address.startswith("0x") and len(wallet_address) == 42


@router.get("/{wallet_address}", response_model=VerifyStudentResponse)
def verify_student(wallet_address: str):
    wallet = wallet_address.lower()

    if not is_valid_wallet_address(wallet):
        raise HTTPException(status_code=400, detail="Invalid wallet address")

    is_valid = verify_student_on_chain(wallet)
    remaining_time = get_remaining_revocation_time(wallet)

    return {
        "wallet_address": wallet,
        "is_valid": is_valid,
        "remaining_revocation_time": remaining_time
    }