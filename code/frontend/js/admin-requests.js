const API_BASE_URL = window.PeraSoulUtils.apiBaseUrl();
const adminToken = sessionStorage.getItem("adminAccessToken");

const requestsPageMessage =
  document.getElementById("requestsPageMessage");
const tokenRequestsTableBody =
  document.getElementById("tokenRequestsTableBody");

function headers() {
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${adminToken}`
  };
}

function showMessage(message, type = "") {
  if (!requestsPageMessage) return;
  requestsPageMessage.textContent = message;
  requestsPageMessage.className = `status ${type}`;
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

    const nameEl = document.getElementById("loggedAdminName");
    if (nameEl) {
      nameEl.textContent =
        data.display_name ||
        sessionStorage.getItem("adminDisplayName") ||
        "University Administrator";
    }
    return true;
  } catch (_) {
    logoutAdmin();
    return false;
  }
}

async function loadTokenRequests() {
  tokenRequestsTableBody.innerHTML =
    '<tr><td colspan="6">Loading token requests...</td></tr>';

  try {
    const response = await fetch(`${API_BASE_URL}/admin/token-requests`, {
      headers: headers()
    });
    const requests = await window.PeraSoulUtils.jsonResponse(response);

    if (!Array.isArray(requests) || !requests.length) {
      tokenRequestsTableBody.innerHTML =
        '<tr><td colspan="6">No pending token requests.</td></tr>';
      showMessage("No pending token requests are available.", "success");
      return;
    }

    tokenRequestsTableBody.innerHTML = requests.map((request) => `
      <tr>
        <td>${window.PeraSoulUtils.escapeHtml(request.id)}</td>
        <td>${window.PeraSoulUtils.escapeHtml(request.student_user_id)}</td>
        <td title="${window.PeraSoulUtils.escapeHtml(request.wallet_address)}">
          ${window.PeraSoulUtils.escapeHtml(
            window.PeraSoulUtils.shortenValue(request.wallet_address)
          )}
        </td>
        <td>${window.PeraSoulUtils.escapeHtml(request.request_note || "-")}</td>
        <td><span class="badge badge-warning">${
          window.PeraSoulUtils.escapeHtml(
            window.PeraSoulUtils.formatStatus(request.request_status)
          )
        }</span></td>
        <td>
          <button type="button" class="btn btn-primary"
            data-approve-request="${Number(request.id)}">
            Approve & Mint
          </button>
        </td>
      </tr>
    `).join("");

    tokenRequestsTableBody
      .querySelectorAll("[data-approve-request]")
      .forEach((button) => {
        button.addEventListener("click", () => {
          approveAndMintToken(Number(button.dataset.approveRequest));
        });
      });

    showMessage(
      `${requests.length} pending token request(s) loaded.`,
      "success"
    );
  } catch (error) {
    tokenRequestsTableBody.innerHTML =
      `<tr><td colspan="6">${window.PeraSoulUtils.escapeHtml(error.message)}</td></tr>`;
    showMessage(error.message, "error");
  }
}

async function approveAndMintToken(requestId) {
  if (!window.confirm(
    `Approve request ${requestId} and submit the token mint transaction?`
  )) return;

  try {
    showMessage(
      `Submitting blockchain mint transaction for request ${requestId}...`
    );

    const response = await fetch(
      `${API_BASE_URL}/admin/approve-request/${requestId}`,
      {method: "POST", headers: headers()}
    );
    const data = await window.PeraSoulUtils.jsonResponse(response);

    showMessage(
      `Token minted successfully. Transaction: ${data.tx_hash}`,
      "success"
    );
    await loadTokenRequests();
  } catch (error) {
    showMessage(error.message || "Token minting failed.", "error");
  }
}

document.getElementById("topLogoutButton")
  ?.addEventListener("click", logoutAdmin);
document.getElementById("sidebarLogoutButton")
  ?.addEventListener("click", logoutAdmin);
document.getElementById("refreshTokenRequestsButton")
  ?.addEventListener("click", loadTokenRequests);

(async () => {
  showMessage("Verifying administrator session...");
  if (!(await verifyAdminSession())) return;
  await loadTokenRequests();
})();
