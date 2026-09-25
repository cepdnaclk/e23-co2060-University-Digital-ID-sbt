def test_openapi_contains_core_student_and_admin_routes(client):
    response = client.get("/openapi.json")

    assert response.status_code == 200
    paths = response.json()["paths"]

    expected_paths = {
        "/student/request-token",
        "/student/dashboard/{wallet_address}",
        "/admin/pending-students",
        "/admin/approve-student/{user_id}",
        "/admin/token-requests",
        "/admin/approve-request/{request_id}",
        "/admin/temporary-revoke",
        "/admin/dashboard",
        "/admin/active-tokens",
        "/admin/revoke-permanently/{student_user_id}",
        "/admin/replace-wallet/{student_user_id}",
    }

    missing = expected_paths - set(paths)
    assert not missing, f"Missing expected API routes: {sorted(missing)}"
