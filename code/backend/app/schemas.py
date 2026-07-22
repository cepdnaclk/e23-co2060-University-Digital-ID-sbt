from pydantic import BaseModel

class StudentRegisterRequest(BaseModel):
    wallet_address: str
    full_name: str
    student_number: str 
    faculty: str | None=None 
    department: str | None=None 
    batch: str | None=None 
    academic_year: str | None=None 
    email: str | None=None 
    phone: str | None=None 

class StudentRegisterResponse(BaseModel):
    message: str 
    user_id: int 
    wallet_address: str 
    role: str 
    status: str 
    full_name: str 
    student_number: str 
    department: str | None=None 

class PendingStudentResponse(BaseModel):
    user_id: int
    wallet_address: str
    status: str
    student_number: str 
    full_name: str 
    department: str | None=None 
    email: str | None=None 

class ApproveStudentResponse(BaseModel):
    message: str 
    user_id: int 
    wallet_address: str 
    status: str

class WalletLoginRequest(BaseModel):
    wallet_address: str

class WalletLoginResponse(BaseModel):
    message: str 
    user_id: int 
    wallet_address: str 
    role: str 
    status: str 

class NonceRequest(BaseModel):
    wallet_address:str

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

class TokenRequestCreate(BaseModel):
    wallet_address: str
    request_note: str | None=None 

class TokenRequestResponse(BaseModel):
    id: int 
    student_user_id: int
    wallet_address: str 
    request_status: str 
    request_note: str | None=None 
    tx_hash: str | None=None

    class config:
        from_attributes = True

class ApproveTokenResponse(BaseModel):
    message: str 
    request_id: int 
    wallet_address: str 
    tx_hash: str 
    status: str 

class TemporaryRevokeRequest(BaseModel):
    wallet_address: str
    months: int = 0 
    days: int = 0 
    hours: int = 0 
    minutes: int = 0 
    reason: str | None=None 

class TemporaryRevokeResponse(BaseModel):
    message: str 
    wallet_address: str 
    duration_seconds: int 
    tx_hash: str 
    status: str 

class VerifyStudentResponse(BaseModel):
    wallet_address: str 
    is_valid: bool 
    remaining_revocation_time: int 

class RemainRevocationTime (BaseModel):
    months: int 
    days: int 
    hours: int 
    minutes: int
class StudentDashboardResponse(BaseModel):
    wallet_address: str 
    full_name: str | None=None 
    student_numbers: str | None=None 
    faculty: str | None=None 
    department: str | None=None 
    batch: str | None=None 
    academic_year: str | None=None 
    account_status: str 
    token_request_status: str | None=None 
    token_status: str | None=None 
    lates_tx_hash: str | None=None 
    is_valid_on_chain: bool 
    remaining_revocation_seconds: int
    remaining_revocation_time: RemainRevocationTime 

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