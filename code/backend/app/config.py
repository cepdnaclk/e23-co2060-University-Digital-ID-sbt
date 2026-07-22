import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./perasoul.db")
RPC_URL = os.getenv("RPC_URL")
ADMIN_PRIVATE_KEY = os.getenv("ADMIN_PRIVATE_KEY")
MANAGER_ADDRESS = os.getenv("MANAGER_ADDRESS")

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./perasoul.db")

RPC_URL = os.getenv("RPC_URL")
ADMIN_PRIVATE_KEY = os.getenv("ADMIN_PRIVATE_KEY")
MANAGER_ADDRESS = os.getenv("MANAGER_ADDRESS")

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(
    os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "300")
)