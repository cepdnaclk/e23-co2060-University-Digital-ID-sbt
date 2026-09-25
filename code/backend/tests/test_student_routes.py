from app.models import TokenRequest
from app.routes import student_routes


def test_active_student_can_request_token(client, db_session, make_student, monkeypatch):
    student = make_student(status="active")
    monkeypatch.setattr(student_routes, "student_has_token", lambda wallet: False)

    response = client.post(
        "/student/request-token",
        json={
            "wallet_address": student.wallet_address,
            "request_note": "Requesting my Digital Student ID",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["student_user_id"] == student.id
    assert body["wallet_address"] == student.wallet_address
    assert body["request_status"] == "pending"

    saved = db_session.query(TokenRequest).filter(TokenRequest.student_user_id == student.id).first()
    assert saved is not None
    assert saved.request_status == "pending"


def test_pending_student_cannot_request_token(client, make_student, monkeypatch):
    student = make_student(status="pending")
    monkeypatch.setattr(student_routes, "student_has_token", lambda wallet: False)

    response = client.post(
        "/student/request-token",
        json={"wallet_address": student.wallet_address, "request_note": "test"},
    )

    assert response.status_code == 403
    assert "Only active students" in response.json()["detail"]


def test_duplicate_pending_token_request_is_rejected(client, make_student, make_token_request, monkeypatch):
    student = make_student(status="active")
    make_token_request(student, status="pending")
    monkeypatch.setattr(student_routes, "student_has_token", lambda wallet: False)

    response = client.post(
        "/student/request-token",
        json={"wallet_address": student.wallet_address, "request_note": "duplicate"},
    )

    assert response.status_code == 409
    assert "already pending" in response.json()["detail"].lower()


def test_wallet_that_already_has_on_chain_token_is_rejected(client, make_student, monkeypatch):
    student = make_student(status="active")
    monkeypatch.setattr(student_routes, "student_has_token", lambda wallet: True)

    response = client.post(
        "/student/request-token",
        json={"wallet_address": student.wallet_address, "request_note": "duplicate chain token"},
    )

    assert response.status_code == 409
    assert "already owns" in response.json()["detail"].lower()


def test_invalid_wallet_is_rejected_for_token_request(client):
    response = client.post(
        "/student/request-token",
        json={"wallet_address": "not-an-ethereum-wallet", "request_note": "test"},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid wallet address"


def test_student_dashboard_without_token(client, make_student):
    student = make_student(status="active")

    response = client.get(f"/student/dashboard/{student.wallet_address}")

    assert response.status_code == 200
    body = response.json()
    assert body["full_name"] == "Test Student"
    assert body["account_status"] == "active"
    assert body["token_id"] is None
    assert body["token_status"] is None
    assert body["is_valid_on_chain"] is False


def test_student_dashboard_returns_active_token(client, make_student, make_token, monkeypatch):
    student = make_student(status="active")
    make_token(student, token_id="7", status="active")

    monkeypatch.setattr(student_routes, "student_has_token", lambda wallet: True)
    monkeypatch.setattr(student_routes, "verify_student_on_chain", lambda wallet: True)
    monkeypatch.setattr(student_routes, "get_remaining_revocation_time", lambda wallet: 0)

    response = client.get(f"/student/dashboard/{student.wallet_address}")

    assert response.status_code == 200
    body = response.json()
    assert body["token_id"] == "7"
    assert body["token_status"] == "active"
    assert body["network"] == "sepolia"
    assert body["is_valid_on_chain"] is True
    assert body["remaining_revocation_seconds"] == 0


def test_dashboard_detects_temporary_revocation_from_blockchain(client, make_student, make_token, monkeypatch):
    student = make_student(status="active")
    make_token(student, token_id="8", status="active")

    monkeypatch.setattr(student_routes, "student_has_token", lambda wallet: True)
    monkeypatch.setattr(student_routes, "verify_student_on_chain", lambda wallet: False)
    monkeypatch.setattr(student_routes, "get_remaining_revocation_time", lambda wallet: 300)

    response = client.get(f"/student/dashboard/{student.wallet_address}")

    assert response.status_code == 200
    body = response.json()
    assert body["token_status"] == "temporarily_revoked"
    assert body["is_valid_on_chain"] is False
    assert body["remaining_revocation_seconds"] == 300
    assert body["remaining_revocation_time"]["minutes"] == 5


def test_missing_student_dashboard_returns_404(client):
    wallet = "0xdddddddddddddddddddddddddddddddddddddddd"
    response = client.get(f"/student/dashboard/{wallet}")

    assert response.status_code == 404
    assert response.json()["detail"] == "Student not found"
