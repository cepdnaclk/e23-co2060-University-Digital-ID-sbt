import importlib

from fastapi import FastAPI


def test_production_main_imports_successfully():

    main_module = (
        importlib.import_module(
            "app.main"
        )
    )

    assert hasattr(
        main_module,
        "app",
    )

    assert isinstance(
        main_module.app,
        FastAPI,
    )


def test_production_main_registers_routes():

    main_module = (
        importlib.import_module(
            "app.main"
        )
    )

    schema=main_module.app.openapi()

    paths=set(
        schema["paths"].keys()
    )

    assert "/auth/register" in paths
    assert "/auth/nonce" in paths
    assert (
        "/auth/verify-signature"
        in paths
    )

    assert(
        "/admin/dashboard"
        in paths
    )

def test_production_openapi_schema_generates():

    main_module = (
        importlib.import_module(
            "app.main"
        )
    )

    schema = (
        main_module.app.openapi()
    )

    assert schema is not None

    assert "paths" in schema

    assert len(
        schema["paths"]
    ) > 0

    assert (
        "/auth/register"
        in schema["paths"]
    )