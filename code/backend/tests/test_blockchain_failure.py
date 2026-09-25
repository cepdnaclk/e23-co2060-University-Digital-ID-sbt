from app.models import (
    StudentToken,
    TransactionLog,
)

from app.routes import admin_routes


def test_failed_blockchain_mint_does_not_create_successful_database_state(
    client,
    db_session,
    make_student,
    make_token_request,
    monkeypatch,
):
    student = make_student(
        status="active"
    )

    token_request = (
        make_token_request(
            student,
            status="pending",
        )
    )

    monkeypatch.setattr(
        admin_routes,
        "student_has_token",
        lambda wallet: False,
    )

    def simulated_failure(wallet):
        raise RuntimeError(
            "Simulated blockchain failure"
        )

    monkeypatch.setattr(
        admin_routes,
        "mint_student_token",
        simulated_failure,
    )

    response = client.post(
        f"/admin/approve-request/"
        f"{token_request.id}"
    )

    assert response.status_code >= 400

    db_session.refresh(
        token_request
    )

    # Most important requirement:
    # failed blockchain mint must NEVER
    # be represented as successfully minted.
    assert (
        token_request.request_status
        != "minted"
    )

    assert token_request.tx_hash is None

    token = (
        db_session.query(StudentToken)
        .filter(
            StudentToken.student_user_id
            == student.id
        )
        .first()
    )

    # No issued token DB record.
    assert token is None

    successful_log = (
        db_session.query(
            TransactionLog
        )
        .filter(
            TransactionLog.action
            == "mint_token",

            TransactionLog.status
            == "success",
        )
        .first()
    )

    assert successful_log is None

    # Your backend may intentionally
    # record the failed transaction.
    failed_log = (
        db_session.query(
            TransactionLog
        )
        .filter(
            TransactionLog.action
            == "mint_token",

            TransactionLog.status
            == "failed",
        )
        .first()
    )

    if failed_log is not None:

        assert (
            "Simulated blockchain failure"
            in failed_log.error_message
        )