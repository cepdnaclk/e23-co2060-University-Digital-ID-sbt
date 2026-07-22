const API_BASE_URL = "http://127.0.0.1:8000";

const studentWalletAddress =
  sessionStorage.getItem("studentWalletAddress");

const studentRole =
  sessionStorage.getItem("studentRole");

const dashboardMessage =
  document.getElementById("studentDashboardMessage");

const requestTokenButton =
  document.getElementById("requestTokenButton");

let currentDashboardData = null;


function showStudentDashboardMessage(message, type = "") {
  dashboardMessage.textContent = message;
  dashboardMessage.className = `status ${type}`;
}


function shortenWallet(walletAddress) {
  if (!walletAddress || walletAddress.length < 12) {
    return walletAddress || "-";
  }

  return `${walletAddress.slice(0, 8)}...${walletAddress.slice(-6)}`;
}


function formatStatus(status) {
  if (!status) {
    return "Not Available";
  }

  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}


function formatRevocationTime(time) {
  if (!time) {
    return "No active revocation";
  }

  const months = Number(time.months || 0);
  const days = Number(time.days || 0);
  const hours = Number(time.hours || 0);
  const minutes = Number(time.minutes || 0);

  const parts = [];

  if (months > 0) {
    parts.push(`${months} month${months === 1 ? "" : "s"}`);
  }

  if (days > 0) {
    parts.push(`${days} day${days === 1 ? "" : "s"}`);
  }

  if (hours > 0) {
    parts.push(`${hours} hour${hours === 1 ? "" : "s"}`);
  }

  if (minutes > 0) {
    parts.push(`${minutes} minute${minutes === 1 ? "" : "s"}`);
  }

  return parts.length > 0
    ? parts.join(", ")
    : "No active revocation";
}


function logoutStudent() {
  sessionStorage.removeItem("studentWalletAddress");
  sessionStorage.removeItem("studentUserId");
  sessionStorage.removeItem("studentRole");
  sessionStorage.removeItem("studentAccountStatus");

  window.location.href = "student-login.html";
}


function protectStudentDashboard() {
  if (
    !studentWalletAddress ||
    studentRole !== "student"
  ) {
    window.location.href = "student-login.html";
    return false;
  }

  return true;
}


function updateAccountBadge(status) {
  const badge =
    document.getElementById("accountStatusBadge");

  badge.textContent = formatStatus(status);

  if (status === "active") {
    badge.className = "badge badge-success";
  } else if (status === "pending") {
    badge.className = "badge badge-warning";
  } else {
    badge.className = "badge badge-danger";
  }
}


function updateTokenRequestControls(data) {
  const requestStatus = data.token_request_status;
  const accountStatus = data.account_status;
  const tokenStatus = data.token_status;

  requestTokenButton.disabled = false;

  if (accountStatus !== "active") {
    requestTokenButton.disabled = true;

    document.getElementById("tokenRequestStatus").textContent =
      `Your account is ${formatStatus(accountStatus)}. University approval is required before requesting a token.`;

    return;
  }

  if (tokenStatus === "active") {
    requestTokenButton.disabled = true;

    document.getElementById("tokenRequestStatus").textContent =
      "Your digital student identity token has already been issued.";

    return;
  }

  if (requestStatus === "pending") {
    requestTokenButton.disabled = true;

    document.getElementById("tokenRequestStatus").textContent =
      "Your token request is pending university administrator approval.";

    return;
  }

  if (requestStatus === "minted") {
    requestTokenButton.disabled = true;

    document.getElementById("tokenRequestStatus").textContent =
      "Your token request has been approved and minted.";

    return;
  }

  document.getElementById("tokenRequestStatus").textContent =
    "Your account is active. You can request your digital student ID.";
}


function renderStudentDashboard(data) {
  currentDashboardData = data;

  const fullName = data.full_name || "Student";

  document.getElementById("studentWelcome").textContent =
    `Welcome, ${fullName}`;

  document.getElementById("loggedStudentName").textContent =
    fullName;

  document.getElementById("studentDashboardDescription").textContent =
    "Your student information and blockchain identity status are shown below.";

  updateAccountBadge(data.account_status);

  document.getElementById("accountStatusMetric").textContent =
    formatStatus(data.account_status);

  document.getElementById("tokenRequestMetric").textContent =
    formatStatus(data.token_request_status);

  document.getElementById("tokenStatusMetric").textContent =
    formatStatus(data.token_status);

  document.getElementById("blockchainValidityMetric").textContent =
    data.is_valid_on_chain ? "Valid" : "Not Valid";

  document.getElementById("profileFullName").textContent =
    data.full_name || "-";

  document.getElementById("profileStudentNumber").textContent =
    data.student_number || "-";

  document.getElementById("profileFaculty").textContent =
    data.faculty || "-";

  document.getElementById("profileDepartment").textContent =
    data.department || "-";

  document.getElementById("profileBatch").textContent =
    data.batch || "-";

  document.getElementById("profileAcademicYear").textContent =
    data.academic_year || "-";

  const walletElement =
    document.getElementById("profileWallet");

  walletElement.textContent =
    shortenWallet(data.wallet_address);

  walletElement.title =
    data.wallet_address;

  const identityValidity =
    document.getElementById("identityValidity");

  identityValidity.textContent =
    data.is_valid_on_chain
      ? "Valid Digital Student Identity"
      : "Identity Not Currently Valid";

  identityValidity.className =
    data.is_valid_on_chain
      ? "text-success"
      : "text-danger";

  document.getElementById("remainingRevocationTime").textContent =
    formatRevocationTime(data.remaining_revocation_time);

  const transactionElement =
    document.getElementById("latestTransaction");

  if (data.latest_tx_hash) {
    transactionElement.textContent =
      shortenWallet(data.latest_tx_hash);

    transactionElement.title =
      data.latest_tx_hash;
  } else {
    transactionElement.textContent =
      "No blockchain transaction";
  }

  updateTokenRequestControls(data);
}


async function loadStudentDashboard() {
  showStudentDashboardMessage(
    "Loading student dashboard..."
  );

  try {
    const response = await fetch(
      `${API_BASE_URL}/student/dashboard/${studentWalletAddress}`
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.detail || "Unable to load student dashboard."
      );
    }

    renderStudentDashboard(data);

    showStudentDashboardMessage(
      "Student dashboard loaded successfully.",
      "success"
    );

  } catch (error) {
    console.error("Student dashboard error:", error);

    showStudentDashboardMessage(
      error.message || "Failed to load student dashboard.",
      "error"
    );
  }
}


async function requestStudentToken() {
  if (!currentDashboardData) {
    showStudentDashboardMessage(
      "Dashboard information is not available.",
      "error"
    );

    return;
  }

  if (currentDashboardData.account_status !== "active") {
    showStudentDashboardMessage(
      "Only approved and active students can request a token.",
      "error"
    );

    return;
  }

  const requestNote =
    document
      .getElementById("tokenRequestNote")
      .value
      .trim();

  requestTokenButton.disabled = true;
  requestTokenButton.textContent = "Submitting Request...";

  try {
    const response = await fetch(
      `${API_BASE_URL}/student/request-token`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          wallet_address: studentWalletAddress,
          request_note:
            requestNote || "Requesting digital student identity token"
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.detail || "Token request failed."
      );
    }

    showStudentDashboardMessage(
      "Digital student ID request submitted successfully.",
      "success"
    );

    document.getElementById("tokenRequestNote").value = "";

    await loadStudentDashboard();

  } catch (error) {
    console.error("Token request error:", error);

    showStudentDashboardMessage(
      error.message || "Unable to submit token request.",
      "error"
    );

  } finally {
    requestTokenButton.textContent =
      "Request Digital Student ID";

    if (
      currentDashboardData &&
      currentDashboardData.account_status === "active" &&
      !currentDashboardData.token_status &&
      currentDashboardData.token_request_status !== "pending"
    ) {
      requestTokenButton.disabled = false;
    }
  }
}


document
  .getElementById("topStudentLogoutButton")
  .addEventListener("click", logoutStudent);

document
  .getElementById("sidebarStudentLogoutButton")
  .addEventListener("click", logoutStudent);

requestTokenButton.addEventListener(
  "click",
  requestStudentToken
);


if (protectStudentDashboard()) {
  loadStudentDashboard();
}