const API_BASE_URL = "http://127.0.0.1:8000";

const studentWalletAddress =
  sessionStorage.getItem("studentWalletAddress");

const studentRole =
  sessionStorage.getItem("studentRole");

const tokenPageMessage =
  document.getElementById("tokenPageMessage");

const sendTokenRequestButton =
  document.getElementById("sendTokenRequestButton");

let currentTokenData = null;


function formatStatus(status) {
  if (!status) {
    return "Not Available";
  }

  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}


function shortenValue(value) {
  if (!value || value.length < 16) {
    return value || "-";
  }

  return `${value.slice(0, 8)}...${value.slice(-6)}`;
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


function showTokenPageMessage(message, type = "") {
  tokenPageMessage.textContent = message;
  tokenPageMessage.className = `status ${type}`;
}


function logoutStudent() {
  sessionStorage.removeItem("studentWalletAddress");
  sessionStorage.removeItem("studentUserId");
  sessionStorage.removeItem("studentRole");
  sessionStorage.removeItem("studentAccountStatus");

  window.location.href = "student-login.html";
}


function protectTokenPage() {
  if (
    !studentWalletAddress ||
    studentRole !== "student"
  ) {
    window.location.href = "student-login.html";
    return false;
  }

  return true;
}


function setBadge(element, value) {
  element.textContent = formatStatus(value);

  if (
    value === "active" ||
    value === "minted"
  ) {
    element.className = "badge badge-success";
  } else if (
    value === "pending" ||
    !value
  ) {
    element.className = "badge badge-warning";
  } else {
    element.className = "badge badge-danger";
  }
}


function updateRequestButton(data) {
  const accountStatus = data.account_status;
  const requestStatus = data.token_request_status;
  const tokenStatus = data.token_status;

  sendTokenRequestButton.disabled = false;

  if (accountStatus !== "active") {
    sendTokenRequestButton.disabled = true;

    document.getElementById("tokenActionStatus").textContent =
      `Your account is ${formatStatus(accountStatus)}. University approval is required first.`;

    return;
  }

  if (tokenStatus === "active") {
    sendTokenRequestButton.disabled = true;

    document.getElementById("tokenActionStatus").textContent =
      "Your digital student identity token has already been issued.";

    return;
  }

  if (requestStatus === "pending") {
    sendTokenRequestButton.disabled = true;

    document.getElementById("tokenActionStatus").textContent =
      "Your token request is waiting for administrator approval.";

    return;
  }

  if (requestStatus === "minted") {
    sendTokenRequestButton.disabled = true;

    document.getElementById("tokenActionStatus").textContent =
      "Your token request has already been approved and minted.";

    return;
  }

  document.getElementById("tokenActionStatus").textContent =
    "You can submit a token issuance request.";
}


function renderTokenData(data) {
  currentTokenData = data;

  document.getElementById("loggedStudentName").textContent =
    data.full_name || "Student";

  setBadge(
    document.getElementById("accountStatus"),
    data.account_status
  );

  setBadge(
    document.getElementById("tokenRequestStatus"),
    data.token_request_status
  );

  setBadge(
    document.getElementById("tokenStatus"),
    data.token_status
  );

  const blockchainValidity =
    document.getElementById("blockchainValidity");

  blockchainValidity.textContent =
    data.is_valid_on_chain
      ? "Valid"
      : "Not Valid";

  blockchainValidity.className =
    data.is_valid_on_chain
      ? "text-success"
      : "text-danger";

  document.getElementById("remainingRevocationTime").textContent =
    formatRevocationTime(data.remaining_revocation_time);

  const walletElement =
    document.getElementById("studentWallet");

  walletElement.textContent =
    shortenValue(data.wallet_address);

  walletElement.title =
    data.wallet_address;

  const transactionElement =
    document.getElementById("latestTransaction");

  if (data.latest_tx_hash) {
    transactionElement.textContent =
      shortenValue(data.latest_tx_hash);

    transactionElement.title =
      data.latest_tx_hash;
  } else {
    transactionElement.textContent =
      "No blockchain transaction";
  }

  updateRequestButton(data);
}


async function loadTokenDetails() {
  showTokenPageMessage(
    "Loading token information..."
  );

  try {
    const response = await fetch(
      `${API_BASE_URL}/student/dashboard/${studentWalletAddress}`
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.detail || "Unable to load token information."
      );
    }

    renderTokenData(data);

    showTokenPageMessage(
      "Token information loaded successfully.",
      "success"
    );

  } catch (error) {
    console.error("Token details error:", error);

    showTokenPageMessage(
      error.message || "Failed to load token information.",
      "error"
    );
  }
}


async function sendTokenRequest() {
  if (!currentTokenData) {
    showTokenPageMessage(
      "Token information is not available.",
      "error"
    );

    return;
  }

  const requestNote =
    document
      .getElementById("tokenRequestNote")
      .value
      .trim();

  sendTokenRequestButton.disabled = true;
  sendTokenRequestButton.textContent = "Submitting Request...";

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

    showTokenPageMessage(
      "Token request submitted successfully.",
      "success"
    );

    document.getElementById("tokenRequestNote").value = "";

    await loadTokenDetails();

  } catch (error) {
    console.error("Token request error:", error);

    showTokenPageMessage(
      error.message || "Unable to submit token request.",
      "error"
    );

  } finally {
    sendTokenRequestButton.textContent =
      "Send Token Request";

    if (
      currentTokenData &&
      currentTokenData.account_status === "active" &&
      !currentTokenData.token_status &&
      currentTokenData.token_request_status !== "pending"
    ) {
      sendTokenRequestButton.disabled = false;
    }
  }
}


document
  .getElementById("topStudentLogoutButton")
  .addEventListener("click", logoutStudent);

document
  .getElementById("sidebarStudentLogoutButton")
  .addEventListener("click", logoutStudent);

sendTokenRequestButton.addEventListener(
  "click",
  sendTokenRequest
);


if (protectTokenPage()) {
  loadTokenDetails();
}