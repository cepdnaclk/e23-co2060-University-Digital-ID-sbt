from web3 import Web3

from app.database import SessionLocal

from app.models import (
    User,
    AdminProfile,
)


def main():

    print()
    print("==============================================")
    print(" PeraSoul Technical Administrator Setup")
    print("==============================================")
    print()

    wallet = input(
        "Technical Admin MetaMask public address: "
    ).strip().lower()

    if not Web3.is_address(wallet):

        print()
        print("ERROR: Invalid Ethereum wallet address.")
        return


    full_name = input(
        "Full name: "
    ).strip()


    designation = input(
        "Designation [Technical Administrator]: "
    ).strip()


    department = input(
        "Department: "
    ).strip()


    email = input(
        "Email: "
    ).strip()


    phone = input(
        "Phone: "
    ).strip()


    db = SessionLocal()


    try:

        # ==================================================
        # CHECK WHETHER WALLET ALREADY EXISTS
        # ==================================================

        existing_user = (
            db.query(User)
            .filter(
                User.wallet_address == wallet
            )
            .first()
        )


        if existing_user:

            # ----------------------------------------------
            # Existing wallet belongs to another role
            # ----------------------------------------------

            if (
                existing_user.role
                != "technical_admin"
            ):

                print()
                print(
                    "ERROR: This wallet is already registered "
                    f"with role '{existing_user.role}'."
                )

                return


            # ----------------------------------------------
            # Existing Technical Admin
            # ----------------------------------------------

            existing_user.status = (
                "active"
            )

            existing_user.login_nonce = (
                None
            )


            profile = (
                db.query(AdminProfile)
                .filter(
                    AdminProfile.user_id
                    == existing_user.id
                )
                .first()
            )


            if not profile:

                profile = AdminProfile(

                    user_id=
                        existing_user.id,

                    full_name=
                        full_name
                        or "Technical Administrator",

                    designation=
                        designation
                        or "Technical Administrator",

                    department=
                        department
                        or None,

                    email=
                        email
                        or None,

                    phone=
                        phone
                        or None,
                )

                db.add(
                    profile
                )


            else:

                if full_name:
                    profile.full_name = (
                        full_name
                    )

                if designation:
                    profile.designation = (
                        designation
                    )

                if department:
                    profile.department = (
                        department
                    )

                if email:
                    profile.email = (
                        email
                    )

                if phone:
                    profile.phone = (
                        phone
                    )


            db.commit()


            print()
            print(
                "Existing Technical Administrator "
                "activated successfully."
            )

            print(
                "User ID:",
                existing_user.id
            )

            print(
                "Wallet:",
                existing_user.wallet_address
            )

            print(
                "Role:",
                existing_user.role
            )

            print(
                "Status:",
                existing_user.status
            )

            return


        # ==================================================
        # CREATE NEW TECHNICAL ADMIN USER
        # ==================================================

        technical_admin = User(

            wallet_address=
                wallet,

            role=
                "technical_admin",

            status=
                "active",
        )


        db.add(
            technical_admin
        )


        # Generate the User ID before creating profile.
        db.flush()


        # ==================================================
        # CREATE ADMIN PROFILE
        # ==================================================

        profile = AdminProfile(

            user_id=
                technical_admin.id,

            full_name=
                full_name
                or "Technical Administrator",

            designation=
                designation
                or "Technical Administrator",

            department=
                department
                or None,

            email=
                email
                or None,

            phone=
                phone
                or None,
        )


        db.add(
            profile
        )


        db.commit()

        db.refresh(
            technical_admin
        )


        print()
        print(
            "Technical Administrator "
            "created successfully."
        )

        print()
        print(
            "User ID:",
            technical_admin.id
        )

        print(
            "Wallet:",
            technical_admin.wallet_address
        )

        print(
            "Role:",
            technical_admin.role
        )

        print(
            "Status:",
            technical_admin.status
        )

        print()
        print(
            "You can now log in through "
            "the Administrator Wallet Login page "
            "using this MetaMask wallet."
        )


    except Exception as error:

        db.rollback()

        print()
        print(
            "ERROR: Unable to create "
            "Technical Administrator."
        )

        print(
            str(error)
        )


    finally:

        db.close()


if __name__ == "__main__":
    main()