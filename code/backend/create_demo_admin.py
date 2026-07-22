from app.database import Base, SessionLocal, engine
from app.models import User, AdminProfile, AdminCredential
from app.utils.admin_auth import hash_password

Base.metadata.create_all(bind=engine)

DEMO_WALLET = "0x3333333333333333333333333333333333333333"
DEMO_USERNAME = "university_admin"
DEMO_PASSWORD = "Admin@12345"


def create_demo_admin():
    db = SessionLocal()

    try:
        existing_credential = db.query(AdminCredential).filter(
            AdminCredential.username == DEMO_USERNAME
        ).first()

        if existing_credential:
            print("Demo administrator already exists.")
            return

        user = db.query(User).filter(
            User.wallet_address == DEMO_WALLET.lower()
        ).first()

        if not user:
            user = User(
                wallet_address=DEMO_WALLET.lower(),
                role="university_admin",
                status="active"
            )

            db.add(user)
            db.flush()

            profile = AdminProfile(
                user_id=user.id,
                full_name="University Administrator",
                designation="Student Affairs Administrator",
                department="University Administration",
                email="admin@university.demo"
            )

            db.add(profile)

        credential = AdminCredential(
            user_id=user.id,
            username=DEMO_USERNAME,
            password_hash=hash_password(DEMO_PASSWORD)
        )

        db.add(credential)
        db.commit()

        print("Demo university administrator created.")
        print(f"Username: {DEMO_USERNAME}")
        print(f"Password: {DEMO_PASSWORD}")

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


if __name__ == "__main__":
    create_demo_admin()