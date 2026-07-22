const API_BASE_URL = "http://127.0.0.1:8000";

const adminToken = sessionStorage.getItem("adminAccessToken");

const dashboardMessage = document.getElementById("dashboardMessage");
const loggedAdminName = document.getElementById("loggedAdminName");

const pendingStudentsTableBody =
  document.getElementById("pendingStudentsTableBody");

const tokenRequestsTableBody =
  document.getElementById("tokenRequestsTableBody");


function getAuthorizationHeaders() {
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${adminToken}`
  };
}


function showDashboardMessage(message, type = "") {
  dashboardMessage.textContent = message;
  dashboardMessage.className = `status ${type}`;
}


function shortenWallet(walletAddress) {
  if (!walletAddress || walletAddress.length < 12) {
    return walletAddress || "-";
  }

  return `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
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
    window.location.href = "admin-login.html";
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
        data.detail || "Administrator session is invalid."
      );
    }

    loggedAdminName.textContent =
      data.username || "University Administrator";

    return true;

  } catch (error) {
    console.error("Session verification failed:", error);
    logoutAdmin();
    return false;
  }
}


async function loadDashboardStatistics() {
  try {
    const response = await fetch(
      `${API_BASE_URL}/admin/dashboard`,
      {
        method: "GET",
        headers: getAuthorizationHeaders()
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.detail || "Unable to load dashboard statistics."
      );
    }

    document.getElementById("totalStudents").textContent =
      data.total_students;

    document.getElementById("pendingStudents").textContent =
      data.pending_students;

    document.getElementById("activeStudents").textContent =
      data.active_students;

    document.getElementById("pendingTokenRequests").textContent =
      data.pending_token_requests;

    document.getElementById("mintedTokens").textContent =
      data.minted_tokens;

    document.getElementById("activeTokens").textContent =
      data.active_tokens;

    document.getElementById("temporaryRevocations").textContent =
      data.temporary_revocations;

    document.getElementById("totalTransactions").textContent =
      data.total_transactions;

  } catch (error) {
    console.error("Dashboard statistics error:", error);

    showDashboardMessage(
      error.message || "Failed to load dashboard statistics.",
      "error"
    );
  }
}


async function loadPendingStudents() {
  pendingStudentsTableBody.innerHTML = `
    <tr>
      <td colspan="7">Loading pending students...</td>
    </tr>
  `;

  try {
    const response = await fetch(
      `${API_BASE_URL}/admin/pending-students`,
      {
        method: "GET",
        headers: getAuthorizationHeaders()
      }
    );

    const students = await response.json();

    if (!response.ok) {
      throw new Error(
        students.detail || "Unable to load pending students."
      );
    }

    if (students.length === 0) {
      pendingStudentsTableBody.innerHTML = `
        <tr>
          <td colspan="7">
            No pending student registrations.
          </td>
        </tr>
      `;

      return;
    }

    pendingStudentsTableBody.innerHTML = students.map((student) => `
      <tr>
        <td>${student.user_id}</td>
        <td>${student.student_number || "-"}</td>
        <td>${student.full_name || "-"}</td>
        <td>${student.department || "-"}</td>

        <td title="${student.wallet_address}">
          ${shortenWallet(student.wallet_address)}
        </td>

        <td>
          <span class="badge badge-warning">
            ${student.status}
          </span>
        </td>

        <td>
          <button
            type="button"
            class="btn btn-primary"
            onclick="approveStudent(${student.user_id})"
          >
            Approve
          </button>
        </td>
      </tr>
    `).join("");

  } catch (error) {
    console.error("Pending student error:", error);

    pendingStudentsTableBody.innerHTML = `
      <tr>
        <td colspan="7">
          ${error.message || "Failed to load pending students."}
        </td>
      </tr>
    `;
  }
}


async function approveStudent(userId) {
  const confirmed = window.confirm(
    `Approve student user ID ${userId}?`
  );

  if (!confirmed) {
    return;
  }

  try {
    showDashboardMessage(
      `Approving student ${userId}...`
    );

    const response = await fetch(
      `${API_BASE_URL}/admin/approve-student/${userId}`,
      {
        method: "POST",
        headers: getAuthorizationHeaders()
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.detail || "Student approval failed."
      );
    }

    showDashboardMessage(
      data.message || "Student approved successfully.",
      "success"
    );

    await Promise.all([
      loadDashboardStatistics(),
      loadPendingStudents()
    ]);

  } catch (error) {
    console.error("Student approval error:", error);

    showDashboardMessage(
      error.message || "Student approval failed.",
      "error"
    );
  }
}


async function loadTokenRequests() {
  tokenRequestsTableBody.innerHTML = `
    <tr>
      <td colspan="6">Loading token requests...</td>
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

    if (requests.length === 0) {
      tokenRequestsTableBody.innerHTML = `
        <tr>
          <td colspan="6">
            No pending token requests.
          </td>
        </tr>
      `;

      return;
    }

    tokenRequestsTableBody.innerHTML = requests.map((request) => `
      <tr>
        <td>${request.id}</td>
        <td>${request.student_user_id}</td>

        <td title="${request.wallet_address}">
          ${shortenWallet(request.wallet_address)}
        </td>

        <td>${request.request_note || "-"}</td>

        <td>
          <span class="badge badge-warning">
            ${request.request_status}
          </span>
        </td>

        <td>
          <button
            type="button"
            class="btn btn-primary"
            onclick="mintStudentToken(${request.id})"
          >
            Approve & Mint
          </button>
        </td>
      </tr>
    `).join("");

  } catch (error) {
    console.error("Token request error:", error);

    tokenRequestsTableBody.innerHTML = `
      <tr>
        <td colspan="6">
          ${error.message || "Failed to load token requests."}
        </td>
      </tr>
    `;
  }
}


async function mintStudentToken(requestId) {
  const confirmed = window.confirm(
    `Approve request ${requestId} and mint the student's token?`
  );

  if (!confirmed) {
    return;
  }

  try {
    showDashboardMessage(
      `Sending token mint transaction for request ${requestId}...`
    );

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

    showDashboardMessage(
      `Token minted successfully. Transaction: ${data.tx_hash}`,
      "success"
    );

    await Promise.all([
      loadDashboardStatistics(),
      loadTokenRequests()
    ]);

  } catch (error) {
    console.error("Token minting error:", error);

    showDashboardMessage(
      error.message || "Token minting failed.",
      "error"
    );
  }
}


async function initializeAdminDashboard() {
  showDashboardMessage("Verifying administrator session...");

  const validSession = await verifyAdminSession();

  if (!validSession) {
    return;
  }

  try {
    await Promise.all([
      loadDashboardStatistics(),
      loadPendingStudents(),
      loadTokenRequests()
    ]);

    showDashboardMessage(
      "Dashboard loaded successfully.",
      "success"
    );

  } catch (error) {
    console.error("Dashboard initialization error:", error);

    showDashboardMessage(
      "Some dashboard information could not be loaded.",
      "error"
    );
  }
}


document
  .getElementById("topLogoutButton")
  .addEventListener("click", logoutAdmin);

document
  .getElementById("sidebarLogoutButton")
  .addEventListener("click", logoutAdmin);

document
  .getElementById("refreshStudentsButton")
  .addEventListener("click", loadPendingStudents);

document
  .getElementById("refreshRequestsButton")
  .addEventListener("click", loadTokenRequests);


initializeAdminDashboard();