from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
)

from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from web3 import Web3

from app.database import get_db

from app.models import (
    User,
    AdminProfile,
    AuditLog,
)

from app.schemas import (
    UniversityAdminCreateRequest,
    UniversityAdminResponse,
    UniversityAdminStatusUpdate,
    UniversityAdminWalletUpdate,
)

from app.utils.admin_wallet_auth import (
    get_current_technical_admin,
)


router = APIRouter(
    prefix="/technical-admin",
    tags=["Technical Administrator"],
)


# ==========================================================
# HELPERS
# ==========================================================

def get_admin_profile(
    db: Session,
    user_id: int,
) -> AdminProfile | None:

    return (
        db.query(AdminProfile)
        .filter(
            AdminProfile.user_id == user_id
        )
        .first()
    )


def build_admin_response(
    user: User,
    profile: AdminProfile | None,
):

    return {
        "id":
            user.id,

        "wallet_address":
            user.wallet_address,

        "role":
            user.role,

        "status":
            user.status,

        "full_name":
            profile.full_name
            if profile else None,

        "designation":
            profile.designation
            if profile else None,

        "department":
            profile.department
            if profile else None,

        "email":
            profile.email
            if profile else None,

        "phone":
            profile.phone
            if profile else None,
    }


# ==========================================================
# LIST UNIVERSITY ADMINISTRATORS
# ==========================================================

@router.get(
    "/admins",
    response_model=list[
        UniversityAdminResponse
    ],
)
def list_university_admins(

    db: Session = Depends(get_db),

    current_technical_admin:
        User = Depends(
            get_current_technical_admin
        ),
):

    rows = (
        db.query(
            User,
            AdminProfile,
        )
        .outerjoin(
            AdminProfile,
            AdminProfile.user_id
            == User.id,
        )
        .filter(
            User.role
            == "university_admin"
        )
        .order_by(
            User.id.asc()
        )
        .all()
    )


    return [
        build_admin_response(
            user,
            profile,
        )
        for user, profile in rows
    ]


# ==========================================================
# GET ONE UNIVERSITY ADMINISTRATOR
# ==========================================================

@router.get(
    "/admins/{admin_id}",
    response_model=UniversityAdminResponse,
)
def get_university_admin(

    admin_id: int,

    db: Session = Depends(get_db),

    current_technical_admin:
        User = Depends(
            get_current_technical_admin
        ),
):

    user = (
        db.query(User)
        .filter(
            User.id == admin_id,
            User.role
            == "university_admin",
        )
        .first()
    )


    if not user:

        raise HTTPException(
            status_code=404,
            detail=(
                "University Administrator "
                "was not found."
            ),
        )


    profile = get_admin_profile(
        db,
        user.id,
    )


    return build_admin_response(
        user,
        profile,
    )


# ==========================================================
# CREATE UNIVERSITY ADMINISTRATOR
# ==========================================================

@router.post(
    "/admins",
    response_model=UniversityAdminResponse,
    status_code=201,
)
def create_university_admin(

    request:
        UniversityAdminCreateRequest,

    db: Session = Depends(get_db),

    current_technical_admin:
        User = Depends(
            get_current_technical_admin
        ),
):

    wallet = (
        request.wallet_address
        .strip()
        .lower()
    )


    # ------------------------------------------------------
    # Validate wallet
    # ------------------------------------------------------

    if not Web3.is_address(
        wallet
    ):

        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid Ethereum "
                "wallet address."
            ),
        )


    # ------------------------------------------------------
    # Make sure wallet is not already registered
    # ------------------------------------------------------

    existing_user = (
        db.query(User)
        .filter(
            func.lower(
                User.wallet_address
            )
            == wallet
        )
        .first()
    )


    if existing_user:

        raise HTTPException(
            status_code=409,
            detail=(
                "This wallet address is "
                "already registered in PeraSoul."
            ),
        )


    try:

        # --------------------------------------------------
        # Create user account
        # --------------------------------------------------

        new_admin = User(

            wallet_address=
                wallet,

            role=
                "university_admin",

            status=
                "active",
        )


        db.add(
            new_admin
        )


        # Get generated user ID before commit.
        db.flush()


        # --------------------------------------------------
        # Create administrator profile
        # --------------------------------------------------

        profile = AdminProfile(

            user_id=
                new_admin.id,

            full_name=
                request.full_name.strip(),

            designation=
                (
                    request.designation.strip()
                    if request.designation
                    else None
                ),

            department=
                (
                    request.department.strip()
                    if request.department
                    else None
                ),

            email=
                (
                    request.email.strip()
                    if request.email
                    else None
                ),

            phone=
                (
                    request.phone.strip()
                    if request.phone
                    else None
                ),
        )


        db.add(
            profile
        )


        # --------------------------------------------------
        # Audit log
        # --------------------------------------------------

        audit_log = AuditLog(

            user_id=
                current_technical_admin.id,

            action=
                "university_admin_created",

            description=(
                "Technical Administrator "
                f"user {current_technical_admin.id} "
                "created University Administrator "
                f"user {new_admin.id} "
                f"for wallet {wallet}."
            ),
        )


        db.add(
            audit_log
        )


        db.commit()


        db.refresh(
            new_admin
        )

        db.refresh(
            profile
        )


        return build_admin_response(
            new_admin,
            profile,
        )


    except IntegrityError:

        db.rollback()

        raise HTTPException(
            status_code=409,
            detail=(
                "Unable to create administrator. "
                "The wallet may already be registered."
            ),
        )


    except Exception as error:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                "Unable to create "
                "University Administrator: "
                f"{error}"
            ),
        )


# ==========================================================
# ACTIVATE / DISABLE UNIVERSITY ADMINISTRATOR
# ==========================================================

@router.patch(
    "/admins/{admin_id}/status",
    response_model=UniversityAdminResponse,
)
def update_university_admin_status(

    admin_id: int,

    request:
        UniversityAdminStatusUpdate,

    db: Session = Depends(get_db),

    current_technical_admin:
        User = Depends(
            get_current_technical_admin
        ),
):

    new_status = (
        request.status
        .strip()
        .lower()
    )


    if new_status not in {
        "active",
        "disabled",
    }:

        raise HTTPException(
            status_code=400,
            detail=(
                "Administrator status must "
                "be either 'active' "
                "or 'disabled'."
            ),
        )


    user = (
        db.query(User)
        .filter(
            User.id == admin_id,
            User.role
            == "university_admin",
        )
        .first()
    )


    if not user:

        raise HTTPException(
            status_code=404,
            detail=(
                "University Administrator "
                "was not found."
            ),
        )


    old_status = (
        user.status
    )


    if old_status == new_status:

        raise HTTPException(
            status_code=400,
            detail=(
                "Administrator is already "
                f"{new_status}."
            ),
        )


    try:

        user.status = (
            new_status
        )


        # Clear any unused login challenge.
        user.login_nonce = None


        audit_log = AuditLog(

            user_id=
                current_technical_admin.id,

            action=
                "university_admin_status_changed",

            description=(
                "Technical Administrator "
                f"user {current_technical_admin.id} "
                "changed University Administrator "
                f"user {user.id} status "
                f"from {old_status} "
                f"to {new_status}."
            ),
        )


        db.add(
            audit_log
        )


        db.commit()

        db.refresh(
            user
        )


        profile = get_admin_profile(
            db,
            user.id,
        )


        return build_admin_response(
            user,
            profile,
        )


    except Exception as error:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                "Unable to update "
                "administrator status: "
                f"{error}"
            ),
        )


# ==========================================================
# CHANGE UNIVERSITY ADMINISTRATOR WALLET
# ==========================================================

@router.patch(
    "/admins/{admin_id}/wallet",
    response_model=UniversityAdminResponse,
)
def update_university_admin_wallet(

    admin_id: int,

    request:
        UniversityAdminWalletUpdate,

    db: Session = Depends(get_db),

    current_technical_admin:
        User = Depends(
            get_current_technical_admin
        ),
):

    new_wallet = (
        request.new_wallet_address
        .strip()
        .lower()
    )


    # ------------------------------------------------------
    # Validate wallet
    # ------------------------------------------------------

    if not Web3.is_address(
        new_wallet
    ):

        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid Ethereum "
                "wallet address."
            ),
        )


    # ------------------------------------------------------
    # Find University Administrator
    # ------------------------------------------------------

    user = (
        db.query(User)
        .filter(
            User.id == admin_id,
            User.role
            == "university_admin",
        )
        .first()
    )


    if not user:

        raise HTTPException(
            status_code=404,
            detail=(
                "University Administrator "
                "was not found."
            ),
        )


    old_wallet = (
        user.wallet_address
    )


    if (
        old_wallet.lower()
        == new_wallet
    ):

        raise HTTPException(
            status_code=400,
            detail=(
                "New wallet address is "
                "the same as the current wallet."
            ),
        )


    # ------------------------------------------------------
    # New wallet cannot belong to another user
    # ------------------------------------------------------

    existing_user = (
        db.query(User)
        .filter(
            func.lower(
                User.wallet_address
            )
            == new_wallet,
            User.id != admin_id,
        )
        .first()
    )


    if existing_user:

        raise HTTPException(
            status_code=409,
            detail=(
                "The new wallet address "
                "is already registered "
                "to another PeraSoul user."
            ),
        )


    try:

        # --------------------------------------------------
        # Replace administrator wallet
        # --------------------------------------------------

        user.wallet_address = (
            new_wallet
        )


        # Remove unused login nonce.
        user.login_nonce = None


        # --------------------------------------------------
        # Audit log
        # --------------------------------------------------

        audit_log = AuditLog(

            user_id=
                current_technical_admin.id,

            action=
                "university_admin_wallet_changed",

            description=(
                "Technical Administrator "
                f"user {current_technical_admin.id} "
                "changed University Administrator "
                f"user {user.id} wallet "
                f"from {old_wallet} "
                f"to {new_wallet}."
            ),
        )


        db.add(
            audit_log
        )


        db.commit()

        db.refresh(
            user
        )


        profile = get_admin_profile(
            db,
            user.id,
        )


        return build_admin_response(
            user,
            profile,
        )


    except IntegrityError:

        db.rollback()

        raise HTTPException(
            status_code=409,
            detail=(
                "The new wallet address "
                "is already registered."
            ),
        )


    except Exception as error:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                "Unable to change "
                "administrator wallet: "
                f"{error}"
            ),
        )