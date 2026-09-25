from app.models import (
    AuditLog,
    RevocationLog,
    StudentToken,
    TransactionLog,
    User,
    WalletRecoveryRequest,
)
from app.routes import admin_routes


def test_pending_students_are_returned(client, make_student):
    pending = make_student(status="pending", student_number="E/23/101", full_name="Pending Student")

    response = client.get("/admin/pending-students")

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["user_id"] == pending.id
    assert body[0]["student_number"] == "E/23/101"
    assert body[0]["status"] == "pending"


def test_admin_can_approve_pending_student(client, db_session, make_student):
    student = make_student(status="pending")

    response = client.post(f"/admin/approve-student/{student.id}")

    assert response.status_code == 200
    db_session.refresh(student)
    assert student.status == "active"

    audit = db_session.query(AuditLog).filter(AuditLog.action == "student_approved").first()
    assert audit is not None


def test_approving_active_student_is_rejected(client, make_student):
    student = make_student(status="active")

    response = client.post(f"/admin/approve-student/{student.id}")

    assert response.status_code == 400
    assert "already active" in response.json()["detail"].lower()


def test_admin_can_mint_approved_token_request(
    client,
    db_session,
    make_student,
    make_token_request,
    monkeypatch,
):
    student = make_student(status="active")
    request = make_token_request(student, status="pending")

    monkeypatch.setattr(admin_routes, "student_has_token", lambda wallet: False)
    monkeypatch.setattr(
        admin_routes,
        "mint_student_token",
        lambda wallet: {
            "tx_hash": "0xmintsuccess",
            "block_number": 1001,
            "gas_used": 155000,
            "status": 1,
            "token_id": 11,
        },
    )
    monkeypatch.setattr(admin_routes, "get_student_token_id", lambda wallet: 11)

    response = client.post(f"/admin/approve-request/{request.id}")

    assert response.status_code == 200
    assert response.json()["status"] == "minted"

    db_session.refresh(request)
    assert request.request_status == "minted"
    assert request.tx_hash == "0xmintsuccess"

    token = db_session.query(StudentToken).filter(StudentToken.student_user_id == student.id).first()
    assert token is not None
    assert token.token_id == "11"
    assert token.status == "active"

    tx = db_session.query(TransactionLog).filter(TransactionLog.action == "mint_token").first()
    assert tx is not None
    assert tx.status == "success"
    assert tx.tx_hash == "0xmintsuccess"


def test_duplicate_database_token_prevents_mint(
    client,
    make_student,
    make_token,
    make_token_request,
    monkeypatch,
):
    student = make_student(status="active")
    make_token(student, token_id="3", status="active")
    request = make_token_request(student, status="pending")
    monkeypatch.setattr(admin_routes, "student_has_token", lambda wallet: False)

    response = client.post(f"/admin/approve-request/{request.id}")

    assert response.status_code == 409
    assert "already has" in response.json()["detail"].lower()


def test_temporary_revocation_updates_database_and_logs(
    client,
    db_session,
    make_student,
    make_token,
    monkeypatch,
):
    student = make_student(status="active")
    token = make_token(student, token_id="21", status="active")

    monkeypatch.setattr(admin_routes, "student_has_token", lambda wallet: True)
    monkeypatch.setattr(
        admin_routes,
        "revoke_student_temporarily",
        lambda wallet, seconds: {
            "tx_hash": "0xtemprevoke",
            "block_number": 2001,
            "gas_used": 90000,
            "status": 1,
        },
    )

    response = client.post(
        "/admin/temporary-revoke",
        json={
            "wallet_address": student.wallet_address,
            "months": 0,
            "days": 0,
            "hours": 0,
            "minutes": 5,
            "reason": "Automated temporary revocation test",
        },
    )

    assert response.status_code == 200
    assert response.json()["duration_seconds"] == 300
    assert response.json()["status"] == "temporarily_revoked"

    db_session.refresh(token)
    assert token.status == "temporarily_revoked"

    revocation = db_session.query(RevocationLog).filter(
        RevocationLog.student_user_id == student.id,
        RevocationLog.revocation_type == "temporary",
    ).first()
    assert revocation is not None
    assert revocation.duration_seconds == 300
    assert revocation.tx_hash == "0xtemprevoke"

    tx = db_session.query(TransactionLog).filter(TransactionLog.action == "temporary_revoke").first()
    assert tx is not None
    assert tx.status == "success"


def test_zero_duration_temporary_revocation_is_rejected(client, make_student, make_token):
    student = make_student(status="active")
    make_token(student, status="active")

    response = client.post(
        "/admin/temporary-revoke",
        json={
            "wallet_address": student.wallet_address,
            "months": 0,
            "days": 0,
            "hours": 0,
            "minutes": 0,
            "reason": "invalid",
        },
    )

    assert response.status_code == 400
    assert "greater than zero" in response.json()["detail"].lower()


def test_permanent_revocation_updates_token_and_logs(
    client,
    db_session,
    make_student,
    make_token,
    monkeypatch,
):
    student = make_student(status="active")
    token = make_token(student, token_id="31", status="active")

    monkeypatch.setattr(admin_routes, "student_has_token", lambda wallet: True)
    monkeypatch.setattr(
        admin_routes,
        "revoke_student_permanently",
        lambda wallet: {
            "tx_hash": "0xpermanent",
            "block_number": 3001,
            "gas_used": 110000,
            "status": 1,
            "token_id": 31,
        },
    )

    response = client.post(
        f"/admin/revoke-permanently/{student.id}",
        json={"reason": "Graduation test"},
    )

    assert response.status_code == 200
    assert response.json()["token_id"] == "31"
    assert response.json()["tx_hash"] == "0xpermanent"

    db_session.refresh(token)
    assert token.status == "permanently_revoked"
    assert token.burn_tx_hash == "0xpermanent"
    assert token.revoked_at is not None

    revocation = db_session.query(RevocationLog).filter(
        RevocationLog.student_user_id == student.id,
        RevocationLog.revocation_type == "permanent",
    ).first()
    assert revocation is not None

    tx = db_session.query(TransactionLog).filter(TransactionLog.action == "permanent_revoke").first()
    assert tx is not None
    assert tx.status == "success"

    audit = db_session.query(AuditLog).filter(AuditLog.action == "permanent_revocation").first()
    assert audit is not None


def test_repeated_permanent_revocation_is_rejected(client, make_student, make_token):
    student = make_student(status="active")
    make_token(student, token_id="32", status="permanently_revoked")

    response = client.post(
        f"/admin/revoke-permanently/{student.id}",
        json={"reason": "Repeat attempt"},
    )

    assert response.status_code == 409


def test_wallet_replacement_updates_user_and_creates_new_token(
    client,
    db_session,
    make_student,
    make_token,
    monkeypatch,
):
    student = make_student(status="active")
    old_wallet = student.wallet_address
    new_wallet = "0xcccccccccccccccccccccccccccccccccccccccc"
    old_token = make_token(student, token_id="41", status="active")
    student.login_nonce = "old-nonce"
    db_session.commit()

    def fake_has_token(wallet):
        return wallet.lower() == old_wallet.lower()

    monkeypatch.setattr(admin_routes, "student_has_token", fake_has_token)
    monkeypatch.setattr(
        admin_routes,
        "replace_student_wallet",
        lambda old, new: {
            "tx_hash": "0xreplace",
            "block_number": 4001,
            "gas_used": 175000,
            "status": 1,
            "old_token_id": 41,
            "new_token_id": 42,
        },
    )

    response = client.post(
        f"/admin/replace-wallet/{student.id}",
        json={
            "new_wallet": new_wallet,
            "reason": "Lost previous wallet",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["old_token_id"] == "41"
    assert body["new_token_id"] == "42"
    assert body["tx_hash"] == "0xreplace"

    db_session.refresh(student)
    db_session.refresh(old_token)
    assert student.wallet_address == new_wallet
    assert student.login_nonce is None
    assert old_token.status == "replaced"

    new_token = db_session.query(StudentToken).filter(
        StudentToken.student_user_id == student.id,
        StudentToken.token_id == "42",
    ).first()
    assert new_token is not None
    assert new_token.wallet_address == new_wallet
    assert new_token.status == "active"

    recovery = db_session.query(WalletRecoveryRequest).filter(
        WalletRecoveryRequest.student_user_id == student.id
    ).first()
    assert recovery is not None
    assert recovery.old_wallet_address == old_wallet
    assert recovery.new_wallet_address == new_wallet
    assert recovery.status == "approved"


def test_wallet_replacement_rejects_same_wallet(client, make_student, make_token):
    student = make_student(status="active")
    make_token(student, token_id="50", status="active")

    response = client.post(
        f"/admin/replace-wallet/{student.id}",
        json={
            "new_wallet": student.wallet_address,
            "reason": "Same wallet should fail",
        },
    )

    assert response.status_code == 400
    assert "same as the old wallet" in response.json()["detail"].lower()


def test_admin_dashboard_counts_students_and_tokens(client, db_session, make_student, make_token, make_token_request):
    pending = make_student(
        wallet="0xdddddddddddddddddddddddddddddddddddddddd",
        status="pending",
        student_number="E/23/201",
        full_name="Pending One",
    )
    active = make_student(
        wallet="0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        status="active",
        student_number="E/23/202",
        full_name="Active One",
    )
    make_token(active, token_id="60", status="active")
    make_token_request(pending, status="pending")

    response = client.get("/admin/dashboard")

    assert response.status_code == 200
    body = response.json()
    assert body["total_students"] == 2
    assert body["pending_students"] == 1
    assert body["active_students"] == 1
    assert body["pending_token_requests"] == 1
    assert body["active_tokens"] == 1


def test_active_token_table_uses_actual_studenttoken_fields(client, make_student, make_token):
    student = make_student(status="active")
    make_token(student, token_id="70", status="active")

    response = client.get("/admin/active-tokens")

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["student_user_id"] == student.id
    assert body[0]["token_id"] == "70"
    assert body[0]["token_status"] == "active"
