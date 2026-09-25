from pydantic import (
    BaseModel,
    ConfigDict,
    Field
)


# ==========================================================
# STUDENT REGISTRATION
# ==========================================================

class StudentRegisterRequest(BaseModel):

    wallet_address: str
    full_name: str
    student_number: str

    faculty: str | None = None
    department: str | None = None
    batch: str | None = None
    academic_year: str | None = None

    email: str | None = None
    phone: str | None = None


class StudentRegisterResponse(BaseModel):

    message: str

    user_id: int
    wallet_address: str

    role: str
    status: str

    full_name: str
    student_number: str

    department: str | None = None


# ==========================================================
# PENDING STUDENT
# ==========================================================

class PendingStudentResponse(BaseModel):

    user_id: int

    wallet_address: str

    status: str

    student_number: str
    full_name: str

    department: str | None = None
    email: str | None = None


class ApproveStudentResponse(BaseModel):

    message: str

    user_id: int

    wallet_address: str

    status: str


# ==========================================================
# STUDENT WALLET LOGIN
# ==========================================================

class WalletLoginRequest(BaseModel):

    wallet_address: str


class WalletLoginResponse(BaseModel):

    message: str

    user_id: int

    wallet_address: str

    role: str
    status: str


# ==========================================================
# NONCE AUTHENTICATION
# ==========================================================

class NonceRequest(BaseModel):

    wallet_address: str


class NonceResponse(BaseModel):

    message: str

    wallet_address: str

    nonce: str


class SignatureVerifyRequest(BaseModel):

    wallet_address: str

    signature: str


class SignatureVerifyResponse(BaseModel):

    message: str

    user_id: int

    wallet_address: str

    role: str

    status: str


# ==========================================================
# TOKEN REQUEST
# ==========================================================

class TokenRequestCreate(BaseModel):

    wallet_address: str

    request_note: str | None = None


class TokenRequestResponse(BaseModel):

    model_config = ConfigDict(
        from_attributes=True
    )

    id: int

    student_user_id: int

    wallet_address: str

    request_status: str

    request_note: str | None = None

    tx_hash: str | None = None


class ApproveTokenResponse(BaseModel):

    message: str

    request_id: int

    wallet_address: str

    tx_hash: str

    status: str


# ==========================================================
# TEMPORARY REVOCATION
# ==========================================================

class TemporaryRevokeRequest(BaseModel):

    wallet_address: str

    months: int = 0

    days: int = 0

    hours: int = 0

    minutes: int = 0

    reason: str | None = None


class TemporaryRevokeResponse(BaseModel):

    message: str

    wallet_address: str

    duration_seconds: int

    tx_hash: str

    status: str


# ==========================================================
# VERIFICATION
# ==========================================================

class VerifyStudentResponse(BaseModel):

    wallet_address: str

    is_valid: bool

    remaining_revocation_time: int


# ==========================================================
# REVOCATION TIME
# ==========================================================

class RemainingRevocationTime(BaseModel):

    months: int = 0

    days: int = 0

    hours: int = 0

    minutes: int = 0


# ==========================================================
# STUDENT DASHBOARD
# ==========================================================

class StudentDashboardResponse(BaseModel):

    wallet_address: str

    full_name: str | None = None

    student_number: str | None = None

    faculty: str | None = None

    department: str | None = None

    batch: str | None = None

    academic_year: str | None = None

    account_status: str

    token_request_status: str | None = None

    # StudentToken.token_id is String in models.py
    token_id: str | None = None

    token_status: str | None = None

    network: str | None = None

    latest_tx_hash: str | None = None

    is_valid_on_chain: bool = False

    remaining_revocation_seconds: int = 0

    remaining_revocation_time:RemainingRevocationTime


# ==========================================================
# ADMIN DASHBOARD
# ==========================================================

class AdminDashboardResponse(BaseModel):

    total_students: int

    pending_students: int

    active_students: int

    suspended_students: int

    disabled_students: int

    pending_token_requests: int

    minted_tokens: int

    active_tokens: int

    temporary_revocations: int

    permanent_revocations: int

    total_transactions: int


# ==========================================================
# OLD ADMIN USERNAME/PASSWORD AUTHENTICATION
#
# Keep these temporarily until wallet login has been tested.
# ==========================================================

class AdminLoginRequest(BaseModel):

    username: str

    password: str


class AdminLoginResponse(BaseModel):

    message: str

    access_token: str

    token_type: str

    user_id: int

    username: str

    role: str

    status: str


class AdminTokenResponse(BaseModel):

    user_id: int

    username: str

    role: str

    status: str


# ==========================================================
# ADMIN WALLET AUTHENTICATION
# ==========================================================

class AdminWalletNonceRequest(BaseModel):

    wallet_address: str


class AdminWalletNonceResponse(BaseModel):

    wallet_address: str

    message: str


class AdminWalletVerifyRequest(BaseModel):

    wallet_address: str

    signature: str


class AdminWalletVerifyResponse(BaseModel):

    access_token: str

    token_type: str

    admin_id: int

    wallet_address: str

    role: str

    display_name: str


class AdminWalletSessionResponse(BaseModel):

    id: int

    wallet_address: str

    role: str

    status: str

    display_name: str


# ==========================================================
# PERMANENT REVOCATION
# ==========================================================

class PermanentRevocationRequest(BaseModel):

    reason: str = Field(
        min_length=3,
        max_length=500
    )


class PermanentRevocationResponse(BaseModel):

    message: str

    student_user_id: int

    token_id: str | None = None

    tx_hash: str

    block_number: int | str | None = None

    gas_used: int | str | None = None

    reason: str


# ==========================================================
# WALLET REPLACEMENT
# ==========================================================

class WalletReplacementRequest(BaseModel):

    new_wallet: str

    reason: str = Field(
        min_length=3,
        max_length=500
    )


class WalletReplacementResponse(BaseModel):

    message: str

    old_wallet: str

    new_wallet: str

    old_token_id: str | None = None

    new_token_id: str | None = None

    tx_hash: str


# ==========================================================
# ACTIVE TOKEN ADMIN TABLE
# ==========================================================

class ActiveStudentTokenResponse(BaseModel):

    student_user_id: int

    student_number: str | None = None

    full_name: str | None = None

    department: str | None = None

    wallet_address: str

    token_id: str | None = None

    token_status: str


# ==========================================================
# PUBLIC QR VERIFICATION
# ==========================================================

class PublicVerificationResponse(BaseModel):

    verified: bool

    status: str

    token_id: str | None = None

    student_number: str | None = None

    full_name: str | None = None

    department: str | None = None

    wallet_address: str

    remaining_seconds: int = 0


# ==========================================================
# WALLET RECOVERY REQUEST
# ==========================================================

class WalletRecoveryRequestCreate(BaseModel):

    new_wallet_address: str

    reason: str | None = None


class WalletRecoveryRequestResponse(BaseModel):

    model_config = ConfigDict(
        from_attributes=True
    )

    id: int

    student_user_id: int

    old_wallet_address: str

    new_wallet_address: str

    reason: str | None = None

    status: str

    tx_hash: str | None = None

# ==========================================================
# TECHNICAL ADMINISTRATION
# ==========================================================

class UniversityAdminCreateRequest(BaseModel):

    wallet_address: str

    full_name: str = Field(
        min_length=2,
        max_length=150
    )

    designation: str | None = None

    department: str | None = None

    email: str | None = None

    phone: str | None = None


class UniversityAdminResponse(BaseModel):

    id: int

    wallet_address: str

    role: str

    status: str

    full_name: str | None = None

    designation: str | None = None

    department: str | None = None

    email: str | None = None

    phone: str | None = None


class UniversityAdminStatusUpdate(BaseModel):

    status: str


class UniversityAdminWalletUpdate(BaseModel):

    new_wallet_address: str