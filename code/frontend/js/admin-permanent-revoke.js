const API_BASE_URL = window.PeraSoulUtils.apiBaseUrl();
const adminToken = sessionStorage.getItem("adminAccessToken");

const form = document.getElementById("permanentRevokeForm");
const submitButton = document.getElementById("permanentRevokeButton");
const messageEl = document.getElementById("permanentRevokeMessage");

function headers() {
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${adminToken}`
  };
}

function showMessage(message, type = "") {
  messageEl.textContent = message;
  messageEl.className = `status ${type}`;
}

function logoutAdmin() {
  window.PeraSoulUtils.clearAdminSession();
  window.location.href = "admin-login.html";
}

async function verifyAdminSession() {
  if (!adminToken) {
    logoutAdmin();
    return false;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/admin-auth/me`, {
      headers: headers()
    });
    const data = await window.PeraSoulUtils.jsonResponse(response);

    document.getElementById("loggedAdminName").textContent =
      data.display_name ||
      sessionStorage.getItem("adminDisplayName") ||
      "University Administrator";

    const wallet = data.wallet_address || sessionStorage.getItem("adminWallet") || "";
    const walletEl = document.getElementById("loggedAdminWallet");
    if (walletEl) {
      walletEl.textContent = window.PeraSoulUtils.shortenValue(wallet, 6, 4);
      walletEl.title = wallet;
    }

    return true;
  } catch (_) {
    logoutAdmin();
    return false;
  }
}

function loadQueryContext() {
  const params = new URLSearchParams(window.location.search);
  const userId = params.get("student_user_id");
  const wallet = params.get("wallet");

  if (userId) {
    document.getElementById("permanentRevokeStudentId").value = userId;
  }

  if (wallet && window.PeraSoulUtils.isEthereumAddress(wallet)) {
    const walletInput = document.getElementById("permanentRevokeWallet");
    walletInput.value = wallet;
    walletInput.readOnly = true;
  }
}

function renderResult(data) {
  document.getElementById("permanentResultTokenId").textContent =
    data.token_id ?? "-";

  const tx = document.getElementById("permanentResultTxHash");
  tx.textContent = window.PeraSoulUtils.shortenValue(data.tx_hash);
  tx.title = data.tx_hash || "";

  document.getElementById("permanentResultBlock").textContent =
    data.block_number ?? "-";
  document.getElementById("permanentResultGas").textContent =
    data.gas_used ?? "-";
  document.getElementById("permanentResultStatus").textContent =
    "Permanently Revoked";
}

async function submitPermanentRevocation(event) {
  event.preventDefault();

  const studentUserId =
    Number(document.getElementById("permanentRevokeStudentId").value);
  const reason =
    document.getElementById("permanentRevokeReason").value.trim();
  const confirmed =
    document.getElementById("permanentRevokeConfirm").checked;

  if (!Number.isInteger(studentUserId) || studentUserId <= 0) {
    showMessage("Enter a valid student user ID.", "error");
    return;
  }

  if (reason.length < 3) {
    showMessage("Enter a meaningful revocation reason.", "error");
    return;
  }

  if (!confirmed) {
    showMessage(
      "Confirm that you understand this operation is permanent.",
      "error"
    );
    return;
  }

  if (!window.confirm(
    "This action permanently invalidates the current Digital Student ID. Continue?"
  )) return;

  submitButton.disabled = true;
  submitButton.textContent = "Submitting Sepolia Transaction...";

  try {
    showMessage("Waiting for permanent revocation confirmation...");

    const response = await fetch(
      `${API_BASE_URL}/admin/revoke-permanently/${studentUserId}`,
      {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({reason})
      }
    );
    const data = await window.PeraSoulUtils.jsonResponse(response);

    renderResult(data);
    showMessage(
      "Digital Student ID permanently revoked successfully.",
      "success"
    );

    submitButton.disabled = true;
  } catch (error) {
    showMessage(error.message || "Permanent revocation failed.", "error");
    submitButton.disabled = false;
  } finally {
    if (!submitButton.disabled) {
      submitButton.textContent = "Permanently Revoke Identity";
    } else {
      submitButton.textContent = "Identity Permanently Revoked";
    }
  }
}

document.getElementById("topLogoutButton")
  ?.addEventListener("click", logoutAdmin);
document.getElementById("sidebarLogoutButton")
  ?.addEventListener("click", logoutAdmin);
form?.addEventListener("submit", submitPermanentRevocation);

(async () => {
  showMessage("Verifying administrator session...");
  if (!(await verifyAdminSession())) return;
  loadQueryContext();
  showMessage("Administrator session verified.", "success");
})();
