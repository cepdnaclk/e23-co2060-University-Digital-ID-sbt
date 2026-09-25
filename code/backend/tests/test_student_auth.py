from eth_account import Account
from eth_account.messages import encode_defunct

from app.models import (
    User,
    StudentProfile,
)


# ==========================================================
# TEST DATA HELPER
# ==========================================================

def registration_payload(
    wallet,
    student_number="E/23/500",
    email="e23500@eng.pdn.ac.lk",
):
    return {
        "wallet_address": wallet,
        "full_name": "Automated Test Student",
        "student_number": student_number,
        "faculty": "Engineering",
        "department": "Computer Engineering",
        "batch": "E23",
        "academic_year": "2",
        "email": email,
        "phone": "0712345678",
    }


# ==========================================================
# 1. VALID STUDENT REGISTRATION
# ==========================================================

def test_valid_registration_creates_pending_user_and_profile(
    client,
    db_session,
):
    account = Account.create()

    response = client.post(
        "/auth/register",
        json=registration_payload(
            account.address
        ),
    )

    assert response.status_code == 200

    body = response.json()

    assert (
        body["wallet_address"]
        == account.address.lower()
    )

    assert body["role"] == "student"
    assert body["status"] == "pending"

    user = (
        db_session.query(User)
        .filter(
            User.wallet_address
            == account.address.lower()
        )
        .first()
    )

    assert user is not None
    assert user.role == "student"
    assert user.status == "pending"

    profile = (
        db_session.query(StudentProfile)
        .filter(
            StudentProfile.user_id
            == user.id
        )
        .first()
    )

    assert profile is not None

    assert (
        profile.student_number
        == "E/23/500"
    )

    assert (
        profile.full_name
        == "Automated Test Student"
    )

    assert (
        profile.department
        == "Computer Engineering"
    )

    assert (
        profile.email
        == "e23500@eng.pdn.ac.lk"
    )


# ==========================================================
# 2A. DUPLICATE WALLET
# ==========================================================

def test_duplicate_wallet_is_rejected(
    client,
):
    account = Account.create()

    first = client.post(
        "/auth/register",
        json=registration_payload(
            account.address,
            student_number="E/23/501",
            email="e23501@eng.pdn.ac.lk",
        ),
    )

    assert first.status_code == 200

    second = client.post(
        "/auth/register",
        json=registration_payload(
            account.address,
            student_number="E/23/502",
            email="e23502@eng.pdn.ac.lk",
        ),
    )

    assert second.status_code == 400

    assert (
        second.json()["detail"]
        == "Wallet address already registered"
    )


# ==========================================================
# 2B. DUPLICATE STUDENT NUMBER
# ==========================================================

def test_duplicate_student_number_is_rejected(
    client,
):
    first_account = Account.create()
    second_account = Account.create()

    first = client.post(
        "/auth/register",
        json=registration_payload(
            first_account.address,
            student_number="E/23/510",
            email="e23510@eng.pdn.ac.lk",
        ),
    )

    assert first.status_code == 200

    second = client.post(
        "/auth/register",
        json=registration_payload(
            second_account.address,
            student_number="E/23/510",
            email="e23511@eng.pdn.ac.lk",
        ),
    )

    assert second.status_code == 400

    assert (
        second.json()["detail"]
        == "Student number already registered"
    )


# ==========================================================
# 2C. DUPLICATE EMAIL
#
# EXPECTED TO FAIL WITH YOUR CURRENT auth_routes.py.
# Run it first and preserve the failure as bug evidence.
# ==========================================================

def test_duplicate_email_is_rejected(
    client,
):
    first_account = Account.create()
    second_account = Account.create()

    first = client.post(
        "/auth/register",
        json=registration_payload(
            first_account.address,
            student_number="E/23/520",
            email="duplicate@eng.pdn.ac.lk",
        ),
    )

    assert first.status_code == 200

    second = client.post(
        "/auth/register",
        json=registration_payload(
            second_account.address,
            student_number="E/23/521",
            email="duplicate@eng.pdn.ac.lk",
        ),
    )

    assert second.status_code == 400

    assert (
        second.json()["detail"]
        == "Email address already registered"
    )


# ==========================================================
# 3. NONCE GENERATION
# ==========================================================

def test_nonce_generation_stores_unique_login_message(
    client,
    db_session,
):
    account = Account.create()

    register = client.post(
        "/auth/register",
        json=registration_payload(
            account.address
        ),
    )

    assert register.status_code == 200

    first = client.post(
        "/auth/nonce",
        json={
            "wallet_address":
                account.address
        },
    )

    assert first.status_code == 200

    first_body = first.json()

    first_nonce = first_body["nonce"]
    first_message = first_body["message"]

    assert first_nonce
    assert first_nonce in first_message

    user = (
        db_session.query(User)
        .filter(
            User.wallet_address
            == account.address.lower()
        )
        .first()
    )

    db_session.refresh(user)

    # Important:
    # your implementation stores the FULL message.
    assert (
        user.login_nonce
        == first_message
    )

    second = client.post(
        "/auth/nonce",
        json={
            "wallet_address":
                account.address
        },
    )

    assert second.status_code == 200

    second_body = second.json()

    assert (
        second_body["nonce"]
        != first_nonce
    )

    assert (
        second_body["message"]
        != first_message
    )

    db_session.refresh(user)

    assert (
        user.login_nonce
        == second_body["message"]
    )


# ==========================================================
# 4. VALID WALLET SIGNATURE
# ==========================================================

def test_valid_wallet_signature_authenticates_student(
    client,
    db_session,
):
    account = Account.create()

    register = client.post(
        "/auth/register",
        json=registration_payload(
            account.address
        ),
    )

    assert register.status_code == 200

    nonce_response = client.post(
        "/auth/nonce",
        json={
            "wallet_address":
                account.address
        },
    )

    assert nonce_response.status_code == 200

    login_message = (
        nonce_response.json()["message"]
    )

    encoded_message = encode_defunct(
        text=login_message
    )

    signed_message = (
        account.sign_message(
            encoded_message
        )
    )

    signature = (
        signed_message.signature.hex()
    )

    response = client.post(
        "/auth/verify-signature",
        json={
            "wallet_address":
                account.address,

            "signature":
                signature,
        },
    )

    assert response.status_code == 200

    body = response.json()

    assert (
        body["wallet_address"]
        == account.address.lower()
    )

    assert body["role"] == "student"

    user = (
        db_session.query(User)
        .filter(
            User.wallet_address
            == account.address.lower()
        )
        .first()
    )

    db_session.refresh(user)

    # Nonce must be consumed after login.
    assert user.login_nonce is None


# ==========================================================
# 5A. WRONG WALLET SIGNATURE
# ==========================================================

def test_wrong_wallet_signature_is_rejected(
    client,
):
    student_account = Account.create()
    attacker_account = Account.create()

    register = client.post(
        "/auth/register",
        json=registration_payload(
            student_account.address
        ),
    )

    assert register.status_code == 200

    nonce_response = client.post(
        "/auth/nonce",
        json={
            "wallet_address":
                student_account.address
        },
    )

    assert nonce_response.status_code == 200

    message = (
        nonce_response.json()["message"]
    )

    encoded_message = encode_defunct(
        text=message
    )

    # Sign using attacker's private key.
    attacker_signature = (
        attacker_account
        .sign_message(
            encoded_message
        )
        .signature
        .hex()
    )

    response = client.post(
        "/auth/verify-signature",
        json={
            "wallet_address":
                student_account.address,

            "signature":
                attacker_signature,
        },
    )

    assert response.status_code == 401

    assert (
        response.json()["detail"]
        == "Signature verification failed"
    )


# ==========================================================
# 5B. REPLAY ATTACK / REUSED SIGNATURE
# ==========================================================

def test_reused_signature_is_rejected(
    client,
):
    account = Account.create()

    register = client.post(
        "/auth/register",
        json=registration_payload(
            account.address
        ),
    )

    assert register.status_code == 200

    nonce_response = client.post(
        "/auth/nonce",
        json={
            "wallet_address":
                account.address
        },
    )

    message = (
        nonce_response.json()["message"]
    )

    encoded_message = encode_defunct(
        text=message
    )

    signature = (
        account
        .sign_message(
            encoded_message
        )
        .signature
        .hex()
    )

    payload = {
        "wallet_address":
            account.address,

        "signature":
            signature,
    }

    # First use should succeed.
    first = client.post(
        "/auth/verify-signature",
        json=payload,
    )

    assert first.status_code == 200

    # Same signed challenge cannot be reused.
    replay = client.post(
        "/auth/verify-signature",
        json=payload,
    )

    assert replay.status_code == 400

    assert (
        "No login nonce found"
        in replay.json()["detail"]
    )