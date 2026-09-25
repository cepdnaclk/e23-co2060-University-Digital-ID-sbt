import os
import sys
import types

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.models import User, StudentProfile, StudentToken, TokenRequest

# ============================================================
# BLOCKCHAIN MODULE SELECTION
# ============================================================
#
# Normal unit/API tests:
#     Use a fake blockchain service.
#
# Live Sepolia integration tests:
#     RUN_SEPOLIA_TESTS=1
#     Use the real app.blockchain.contract_service.
# ============================================================

RUN_SEPOLIA_TESTS = (
    os.getenv("RUN_SEPOLIA_TESTS") == "1"
)


if not RUN_SEPOLIA_TESTS:

    fake_contract_service = types.ModuleType(
        "app.blockchain.contract_service"
    )

RUN_LIVE_BLOCKCHAIN = (
    os.getenv("RUN_SEPOLIA_TESTS") == "1"
    or os.getenv("RUN_SEPOLIA_TX_TESTS") == "1"
)

if not RUN_LIVE_BLOCKCHAIN:

    def _false(*args, **kwargs):
        return False


    def _zero(*args, **kwargs):
        return 0


    def _not_configured(*args, **kwargs):
        raise RuntimeError(
            "Blockchain function was not mocked "
            "for this test."
        )


    fake_contract_service.student_has_token = _false

    fake_contract_service.verify_student_on_chain = _false

    fake_contract_service.get_remaining_revocation_time = _zero

    fake_contract_service.get_student_token_id = _not_configured

    fake_contract_service.mint_student_token = _not_configured

    fake_contract_service.revoke_student_temporarily = _not_configured

    fake_contract_service.revoke_student_permanently = _not_configured

    fake_contract_service.revoke_student_permanentlt = _not_configured

    fake_contract_service.replace_student_wallet = _not_configured

    fake_contract_service.get_manager_owner = _not_configured

    fake_contract_service.is_permanently_revoked = _false

    fake_contract_service.get_temporary_revocation_until = _zero

    fake_contract_service.get_current_block_timestamp = _zero


    sys.modules[
        "app.blockchain.contract_service"
    ] = fake_contract_service


# Import routes only after the fake blockchain module is installed.
from app.routes import student_routes, admin_routes, auth_routes  # noqa: E402
from app.utils import admin_wallet_auth  # noqa: E402


TEST_DATABASE_URL = "sqlite://"

engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    expire_on_commit=False,
)

TEST_MANAGER_ADDRESS = "0x1111111111111111111111111111111111111111"
ADMIN_WALLET = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
STUDENT_WALLET = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
SECOND_WALLET = "0xcccccccccccccccccccccccccccccccccccccccc"


@pytest.fixture(autouse=True)
def clean_database(monkeypatch):
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    # Never depend on the real manager address in unit/API tests.
    monkeypatch.setattr(admin_routes, "MANAGER_ADDRESS", TEST_MANAGER_ADDRESS)

    # Deterministic JWT settings for tests.
    monkeypatch.setattr(admin_wallet_auth, "SECRET_KEY", "perasoul-test-secret-key")
    monkeypatch.setattr(admin_wallet_auth, "ALGORITHM", "HS256")
    monkeypatch.setattr(admin_wallet_auth, "ACCESS_TOKEN_EXPIRE_MINUTES", 30)

    yield


@pytest.fixture
def db_session():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def admin_user(db_session):
    admin = User(
        wallet_address=ADMIN_WALLET,
        role="university_admin",
        status="active",
    )
    db_session.add(admin)
    db_session.commit()
    db_session.refresh(admin)
    return admin


@pytest.fixture
def app(db_session, admin_user):
    test_app = FastAPI(title="PeraSoul Test API")
    test_app.include_router(auth_routes.router)
    test_app.include_router(student_routes.router)
    test_app.include_router(admin_routes.router)

    def override_get_db():
        yield db_session

    def override_current_admin():
        return admin_user

    test_app.dependency_overrides[get_db] = override_get_db
    test_app.dependency_overrides[admin_routes.get_current_admin] = override_current_admin

    return test_app


@pytest.fixture
def client(app):
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def secured_app(db_session):
    """Admin routes with the REAL get_current_admin dependency enabled."""
    test_app = FastAPI(title="PeraSoul Security Test API")
    test_app.include_router(admin_routes.router)

    def override_get_db():
        yield db_session

    test_app.dependency_overrides[get_db] = override_get_db
    return test_app


@pytest.fixture
def secured_client(secured_app):
    with TestClient(secured_app) as test_client:
        yield test_client


@pytest.fixture
def make_student(db_session):
    def _make_student(
        wallet=STUDENT_WALLET,
        status="active",
        student_number="E/23/999",
        full_name="Test Student",
    ):
        user = User(
            wallet_address=wallet.lower(),
            role="student",
            status=status,
        )
        db_session.add(user)
        db_session.flush()

        profile = StudentProfile(
            user_id=user.id,
            student_number=student_number,
            full_name=full_name,
            faculty="Engineering",
            department="Computer Engineering",
            batch="E23",
            academic_year="2",
            email=f"{student_number.replace('/', '').lower()}@eng.pdn.ac.lk",
        )
        db_session.add(profile)
        db_session.commit()
        db_session.refresh(user)
        return user

    return _make_student


@pytest.fixture
def make_token(db_session):
    def _make_token(user, token_id="1", status="active", wallet=None):
        token = StudentToken(
            student_user_id=user.id,
            wallet_address=(wallet or user.wallet_address).lower(),
            token_id=str(token_id),
            contract_address=TEST_MANAGER_ADDRESS,
            network="sepolia",
            status=status,
            mint_tx_hash="0xmint",
        )
        db_session.add(token)
        db_session.commit()
        db_session.refresh(token)
        return token

    return _make_token


@pytest.fixture
def make_token_request(db_session):
    def _make_request(user, status="pending", wallet=None):
        request = TokenRequest(
            student_user_id=user.id,
            wallet_address=(wallet or user.wallet_address).lower(),
            request_status=status,
            request_note="Automated backend test request",
        )
        db_session.add(request)
        db_session.commit()
        db_session.refresh(request)
        return request

    return _make_request
