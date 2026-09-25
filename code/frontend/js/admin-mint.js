const API_BASE_URL = window.PeraSoulUtils.apiBaseUrl();
const adminToken = sessionStorage.getItem("adminAccessToken");

const mintPageMessage = document.getElementById("mintPageMessage");
const mintRequestsTableBody =
  document.getElementById("mintRequestsTableBody");
const mintSelectedRequestButton =
  document.getElementById("mintSelectedRequestButton");

let selectedRequest = null;

function headers() {
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${adminToken}`
  };
}

function pageMessage(message, type = "") {
  if (!mintPageMessage) return;
  mintPageMessage.textContent = message;
  mintPageMessage.className = `status ${type}`;
}

function mintStatus(message, type = "") {
  const el = document.getElementById("mintStatus");
  if (!el) return;
  el.textContent = message;
  el.className = `status ${type}`;
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

    const name = document.getElementById("loggedAdminName");
    if (name) {
      name.textContent =
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

function clearSelection() {
  selectedRequest = null;

  [
    ["selectedRequestId", "-"],
    ["selectedStudentUserId", "-"],
    ["selectedWalletAddress", "-"],
    ["selectedRequestNote", "-"]
  ].forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  });

  const badge = document.getElementById("selectedRequestStatus");
  if (badge) {
    badge.textContent = "Not Selected";
    badge.className = "badge badge-warning";
  }

  if (mintSelectedRequestButton) mintSelectedRequestButton.disabled = true;
  mintStatus("Select a pending token request.");
}

function selectRequest(request) {
  selectedRequest = request;

  document.getElementById("selectedRequestId").textContent = request.id;
  document.getElementById("selectedStudentUserId").textContent =
    request.student_user_id;

  const wallet = document.getElementById("selectedWalletAddress");
  wallet.textContent = window.PeraSoulUtils.shortenValue(
    request.wallet_address
  );
  wallet.title = request.wallet_address;

  document.getElementById("selectedRequestNote").textContent =
    request.request_note || "-";

  const badge = document.getElementById("selectedRequestStatus");
  badge.textContent = window.PeraSoulUtils.formatStatus(
    request.request_status
  );
  badge.className = "badge badge-warning";

  mintSelectedRequestButton.disabled = false;
  mintStatus(
    `Request ${request.id} selected. Review the details before minting.`,
    "success"
  );
}

async function loadPendingTokenRequests() {
  clearSelection();
  mintRequestsTableBody.innerHTML =
    '<tr><td colspan="5">Loading pending token requests...</td></tr>';

  try {
    const response = await fetch(`${API_BASE_URL}/admin/token-requests`, {
      headers: headers()
    });
    const requests = await window.PeraSoulUtils.jsonResponse(response);

    if (!Array.isArray(requests) || !requests.length) {
      mintRequestsTableBody.innerHTML =
        '<tr><td colspan="5">No pending token requests.</td></tr>';
      pageMessage("No pending token requests are available.");
      return;
    }

    mintRequestsTableBody.innerHTML = requests.map((request, index) => `
      <tr>
        <td>${window.PeraSoulUtils.escapeHtml(request.id)}</td>
        <td>${window.PeraSoulUtils.escapeHtml(request.student_user_id)}</td>
        <td title="${window.PeraSoulUtils.escapeHtml(request.wallet_address)}">
          ${window.PeraSoulUtils.escapeHtml(
            window.PeraSoulUtils.shortenValue(request.wallet_address)
          )}
        </td>
        <td><span class="badge badge-warning">${
          window.PeraSoulUtils.escapeHtml(
            window.PeraSoulUtils.formatStatus(request.request_status)
          )
        }</span></td>
        <td>
          <button type="button" class="btn btn-outline"
            data-request-index="${index}">Select</button>
        </td>
      </tr>
    `).join("");

    mintRequestsTableBody
      .querySelectorAll("[data-request-index]")
      .forEach((button) => {
        button.addEventListener("click", () => {
          selectRequest(requests[Number(button.dataset.requestIndex)]);
        });
      });

    pageMessage(
      `${requests.length} pending token request(s) loaded.`,
      "success"
    );
  } catch (error) {
    mintRequestsTableBody.innerHTML =
      `<tr><td colspan="5">${window.PeraSoulUtils.escapeHtml(error.message)}</td></tr>`;
    pageMessage(error.message, "error");
  }
}

async function mintSelectedRequest() {
  if (!selectedRequest) {
    mintStatus("Select a pending request first.", "error");
    return;
  }

  if (!window.confirm(
    `Mint a PeraSoul Digital Student ID for request ${selectedRequest.id}?`
  )) return;

  mintSelectedRequestButton.disabled = true;
  mintSelectedRequestButton.textContent = "Submitting Sepolia Transaction...";

  try {
    mintStatus("Waiting for blockchain confirmation...");

    const response = await fetch(
      `${API_BASE_URL}/admin/approve-request/${selectedRequest.id}`,
      {method: "POST", headers: headers()}
    );
    const data = await window.PeraSoulUtils.jsonResponse(response);

    mintStatus(
      `Token minted successfully. Transaction: ${data.tx_hash}`,
      "success"
    );
    pageMessage("Token issuance completed successfully.", "success");

    await loadPendingTokenRequests();
  } catch (error) {
    mintStatus(error.message || "Token minting failed.", "error");
    mintSelectedRequestButton.disabled = false;
  } finally {
    mintSelectedRequestButton.textContent = "Approve and Mint Token";
  }
}

document.getElementById("topLogoutButton")
  ?.addEventListener("click", logoutAdmin);
document.getElementById("sidebarLogoutButton")
  ?.addEventListener("click", logoutAdmin);
document.getElementById("refreshRequestsButton")
  ?.addEventListener("click", loadPendingTokenRequests);
mintSelectedRequestButton
  ?.addEventListener("click", mintSelectedRequest);

(async () => {
  pageMessage("Verifying administrator session...");
  if (!(await verifyAdminSession())) return;
  await loadPendingTokenRequests();
})();
