const API_BASE_URL = "http://127.0.0.1:8000";

const adminToken =
  sessionStorage.getItem("adminAccessToken");

const requestsPageMessage =
  document.getElementById("requestsPageMessage");

const tokenRequestsTableBody =
  document.getElementById("tokenRequestsTableBody");


function getAuthorizationHeaders() {
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${adminToken}`
  };
}


function showRequestsMessage(message, type = "") {
  requestsPageMessage.textContent = message;
  requestsPageMessage.className = `status ${type}`;
}


function shortenValue(value) {
  if (!value || value.length < 16) {
    return value || "-";
  }

  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}


function logoutAdmin() {
  sessionStorage.removeItem("adminAccessToken");
  sessionStorage.removeItem("adminUserId");
  sessionStorage.removeItem("adminUsername");
  sessionStorage.removeItem("adminRole");

  window.location.href = "admin-login.html";
}


async function verifyAdminSession() {
  if (!adminToken) {
    logoutAdmin();
    return false;
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/admin-auth/me`,
      {
        method: "GET",
        headers: getAuthorizationHeaders()
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.detail || "Invalid administrator session."
      );
    }

    document.getElementById("loggedAdminName").textContent =
      data.username || "University Administrator";

    return true;

  } catch (error) {
    console.error("Admin session error:", error);
    logoutAdmin();
    return false;
  }
}


async function loadTokenRequests() {
  tokenRequestsTableBody.innerHTML = `
    <tr>
      <td colspan="6">
        Loading token requests...
      </td>
    </tr>
  `;

  try {
    const response = await fetch(
      `${API_BASE_URL}/admin/token-requests`,
      {
        method: "GET",
        headers: getAuthorizationHeaders()
      }
    );

    const requests = await response.json();

    if (!response.ok) {
      throw new Error(
        requests.detail || "Unable to load token requests."
      );
    }

    if (!Array.isArray(requests) || requests.length === 0) {
      tokenRequestsTableBody.innerHTML = `
        <tr>
          <td colspan="6">
            No pending token requests.
          </td>
        </tr>
      `;

      return;
    }

    tokenRequestsTableBody.innerHTML =
      requests.map((request) => `
        <tr>

          <td>
            ${request.id}
          </td>

          <td>
            ${request.student_user_id}
          </td>

          <td title="${request.wallet_address}">
            ${shortenValue(request.wallet_address)}
          </td>

          <td>
            ${request.request_note || "-"}
          </td>

          <td>
            <span class="badge badge-warning">
              ${request.request_status}
            </span>
          </td>

          <td>
            <button
              type="button"
              class="btn btn-primary"
              onclick="approveAndMintToken(${request.id})"
            >
              Approve & Mint
            </button>
          </td>

        </tr>
      `).join("");

  } catch (error) {
    console.error("Token request loading error:", error);

    tokenRequestsTableBody.innerHTML = `
      <tr>
        <td colspan="6">
          ${error.message || "Failed to load token requests."}
        </td>
      </tr>
    `;

    showRequestsMessage(
      error.message || "Failed to load token requests.",
      "error"
    );
  }
}


async function approveAndMintToken(requestId) {
  const confirmed = window.confirm(
    `Approve token request ${requestId} and mint the Soulbound Token?`
  );

  if (!confirmed) {
    return;
  }

  showRequestsMessage(
    `Submitting blockchain mint transaction for request ${requestId}...`
  );

  try {
    const response = await fetch(
      `${API_BASE_URL}/admin/approve-request/${requestId}`,
      {
        method: "POST",
        headers: getAuthorizationHeaders()
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.detail || "Token minting failed."
      );
    }

    showRequestsMessage(
      `Token minted successfully. Transaction hash: ${data.tx_hash}`,
      "success"
    );

    await loadTokenRequests();

  } catch (error) {
    console.error("Token minting error:", error);

    showRequestsMessage(
      error.message || "Unable to mint the token.",
      "error"
    );
  }
}


async function initializeRequestsPage() {
  showRequestsMessage(
    "Verifying administrator session..."
  );

  const validSession =
    await verifyAdminSession();

  if (!validSession) {
    return;
  }

  await loadTokenRequests();

  showRequestsMessage(
    "Token requests loaded successfully.",
    "success"
  );
}


document
  .getElementById("topLogoutButton")
  .addEventListener("click", logoutAdmin);

document
  .getElementById("sidebarLogoutButton")
  .addEventListener("click", logoutAdmin);

document
  .getElementById("refreshTokenRequestsButton")
  .addEventListener("click", loadTokenRequests);


initializeRequestsPage();