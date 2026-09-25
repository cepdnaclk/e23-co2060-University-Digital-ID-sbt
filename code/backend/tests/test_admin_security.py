from jose import jwt

from app.models import User
from app.utils import admin_wallet_auth


ADMIN_WALLET = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"


def test_admin_route_rejects_missing_jwt(secured_client):
    response = secured_client.get("/admin/dashboard")

    assert response.status_code == 401
    assert "authentication required" in response.json()["detail"].lower()


def test_admin_route_accepts_valid_wallet_jwt(secured_client, db_session):
    admin = User(
        wallet_address=ADMIN_WALLET,
        role="university_admin",
        status="active",
    )
    db_session.add(admin)
    db_session.commit()
    db_session.refresh(admin)

    token = admin_wallet_auth.create_admin_access_token(admin)

    response = secured_client.get(
        "/admin/dashboard",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200


def test_admin_route_rejects_token_with_wrong_role(secured_client, db_session):
    student = User(
        wallet_address="0xffffffffffffffffffffffffffffffffffffffff",
        role="student",
        status="active",
    )
    db_session.add(student)
    db_session.commit()
    db_session.refresh(student)

    bad_token = jwt.encode(
        {
            "sub": str(student.id),
            "wallet": student.wallet_address,
            "role": "student",
        },
        admin_wallet_auth.SECRET_KEY,
        algorithm=admin_wallet_auth.ALGORITHM,
    )

    response = secured_client.get(
        "/admin/dashboard",
        headers={"Authorization": f"Bearer {bad_token}"},
    )

    assert response.status_code == 401
    assert "invalid administrator token" in response.json()["detail"].lower()


def test_admin_route_rejects_jwt_after_wallet_changes(secured_client, db_session):
    admin = User(
        wallet_address=ADMIN_WALLET,
        role="university_admin",
        status="active",
    )
    db_session.add(admin)
    db_session.commit()
    db_session.refresh(admin)

    token = admin_wallet_auth.create_admin_access_token(admin)

    admin.wallet_address = "0x1234567890123456789012345678901234567890"
    db_session.commit()

    response = secured_client.get(
        "/admin/dashboard",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 401
    assert "wallet has changed" in response.json()["detail"].lower()
