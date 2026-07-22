const API_BASE_URL = "http://127.0.0.1:8000";

const adminToken =
  sessionStorage.getItem("adminAccessToken");

const mintPageMessage =
  document.getElementById("mintPageMessage");

const mintRequestsTableBody =
  document.getElementById("mintRequestsTableBody");

const mintSelectedRequestButton =
  document.getElementById("mintSelectedRequestButton");

let selectedRequest = null;


function getAuthorizationHeaders() {
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${adminToken}`
  };
}


function showMintPageMessage(message, type = "") {
  mintPageMessage.textContent = message;
  mintPageMessage.className = `status ${type}`;
}


function showMintStatus(message, type = "") {
  const mintStatus =
    document.getElementById("mintStatus");

  mintStatus.textContent = message;
  mintStatus.className = `status ${type}`;
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
    console.error("Admin session verification error:", error);
    logoutAdmin();
    return false;
  }
}


function clearSelectedRequest() {
  selectedRequest = null;

  document.getElementById("selectedRequestId").textContent = "-";
  document.getElementById("selectedStudentUserId").textContent = "-";
  document.getElementById("selectedWalletAddress").textContent = "-";
  document.getElementById("selectedWalletAddress").title = "";
  document.getElementById("selectedRequestNote").textContent = "-";

  const statusBadge =
    document.getElementById("selectedRequestStatus");

  statusBadge.textContent = "Not Selected";
  statusBadge.className = "badge badge-warning";

  mintSelectedRequestButton.disabled = true;

  showMintStatus(
    "Select a pending token request."
  );
}


function selectTokenRequest(request) {
  selectedRequest = request;

  document.getElementById("selectedRequestId").textContent =
    request.id;

  document.getElementById("selectedStudentUserId").textContent =
    request.student_user_id;

  const walletElement =
    document.getElementById("selectedWalletAddress");

  walletElement.textContent =
    shortenValue(request.wallet_address);

  walletElement.title =
    request.wallet_address;

  document.getElementById("selectedRequestNote").textContent =
    request.request_note || "-";

  const statusBadge =
    document.getElementById("selectedRequestStatus");

  statusBadge.textContent =
    request.request_status;

  statusBadge.className =
    "badge badge-warning";

  mintSelectedRequestButton.disabled = false;

  showMintStatus(
    `Request ${request.id} selected. Review the details before minting.`,
    "success"
  );
}


async function loadPendingTokenRequests() {
  clearSelectedRequest();

  mintRequestsTableBody.innerHTML = `
    <tr>
      <td colspan="5">
        Loading pending token requests...
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
      mintRequestsTableBody.innerHTML = `
        <tr>
          <td colspan="5">
            No pending token requests.
          </td>
        </tr>
      `;

      showMintPageMessage(
        "No pending token requests are available."
      );

      return;
    }

    mintRequestsTableBody.innerHTML =
      requests.map((request, index) => `
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
            <span class="badge badge-warning">
              ${request.request_status}
            </span>
          </td>

          <td>
            <button
              type="button"
              class="btn btn-outline"
              data-request-index="${index}"
            >
              Select
            </button>
          </td>

        </tr>
      `).join("");

    const selectButtons =
      mintRequestsTableBody.querySelectorAll(
        "[data-request-index]"
      );

    selectButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const requestIndex =
          Number(button.dataset.requestIndex);

        selectTokenRequest(
          requests[requestIndex]
        );
      });
    });

    showMintPageMessage(
      `${requests.length} pending token request(s) loaded.`,
      "success"
    );

  } catch (error) {
    console.error("Token request loading error:", error);

    mintRequestsTableBody.innerHTML = `
      <tr>
        <td colspan="5">
          ${error.message || "Failed to load token requests."}
        </td>
      </tr>
    `;

    showMintPageMessage(
      error.message || "Failed to load token requests.",
      "error"
    );
  }
}


async function mintSelectedRequest() {
  if (!selectedRequest) {
    showMintStatus(
      "Select a pending request first.",
      "error"
    );

    return;
  }

  const confirmed = window.confirm(
    `Approve request ${selectedRequest.id} and mint the token to ${selectedRequest.wallet_address}?`
  );

  if (!confirmed) {
    return;
  }

  mintSelectedRequestButton.disabled = true;
  mintSelectedRequestButton.textContent =
    "Submitting Blockchain Transaction...";

  showMintStatus(
    "Sending the token mint transaction to Sepolia..."
  );

  try {
    const response = await fetch(
      `${API_BASE_URL}/admin/approve-request/${selectedRequest.id}`,
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

    showMintStatus(
      `Token minted successfully. Transaction hash: ${data.tx_hash}`,
      "success"
    );

    showMintPageMessage(
      "Blockchain mint transaction completed successfully.",
      "success"
    );

    selectedRequest = null;

    await loadPendingTokenRequests();

  } catch (error) {
    console.error("Token minting error:", error);

    showMintStatus(
      error.message || "Unable to mint the token.",
      "error"
    );

  } finally {
    mintSelectedRequestButton.textContent =
      "Approve and Mint Token";

    if (selectedRequest) {
      mintSelectedRequestButton.disabled = false;
    }
  }
}


async function initializeMintPage() {
  showMintPageMessage(
    "Verifying administrator session..."
  );

  const validSession =
    await verifyAdminSession();

  if (!validSession) {
    return;
  }

  await loadPendingTokenRequests();
}


document
  .getElementById("topLogoutButton")
  .addEventListener("click", logoutAdmin);

document
  .getElementById("sidebarLogoutButton")
  .addEventListener("click", logoutAdmin);

document
  .getElementById("refreshRequestsButton")
  .addEventListener("click", loadPendingTokenRequests);

mintSelectedRequestButton.addEventListener(
  "click",
  mintSelectedRequest
);


initializeMintPage();