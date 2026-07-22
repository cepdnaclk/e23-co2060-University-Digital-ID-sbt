const API_BASE_URL = "http://127.0.0.1:8000";

const adminToken =
  sessionStorage.getItem("adminAccessToken");

const temporaryRevokeForm =
  document.getElementById("temporaryRevokeForm");

const temporaryRevokeButton =
  document.getElementById("temporaryRevokeButton");

const temporaryRevokeMessage =
  document.getElementById("temporaryRevokeMessage");

const studentWalletInput =
  document.getElementById("studentWalletAddress");

const checkVerificationButton =
  document.getElementById("checkVerificationButton");

const startMonitoringButton =
  document.getElementById("startMonitoringButton");

let verificationInterval = null;


function getAuthorizationHeaders() {
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${adminToken}`
  };
}


function showTemporaryRevokeMessage(message, type = "") {
  temporaryRevokeMessage.textContent = message;
  temporaryRevokeMessage.className = `status ${type}`;
}


function showVerificationStatus(message, type = "") {
  const statusElement =
    document.getElementById("verificationStatus");

  statusElement.textContent = message;
  statusElement.className = `status ${type}`;
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


function logoutAdmin() {
  if (verificationInterval) {
    clearInterval(verificationInterval);
  }

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

    showTemporaryRevokeMessage(
      "Administrator session verified.",
      "success"
    );

    return true;

  } catch (error) {
    console.error("Admin session error:", error);
    logoutAdmin();
    return false;
  }
}


function getDurationValues() {
  return {
    months:
      Number(document.getElementById("revokeMonths").value || 0),

    days:
      Number(document.getElementById("revokeDays").value || 0),

    hours:
      Number(document.getElementById("revokeHours").value || 0),

    minutes:
      Number(document.getElementById("revokeMinutes").value || 0)
  };
}


function validateDuration(duration) {
  const values = [
    duration.months,
    duration.days,
    duration.hours,
    duration.minutes
  ];

  if (values.some((value) => value < 0)) {
    throw new Error(
      "Duration values cannot be negative."
    );
  }

  const total =
    duration.months +
    duration.days +
    duration.hours +
    duration.minutes;

  if (total <= 0) {
    throw new Error(
      "Revocation duration must be greater than zero."
    );
  }
}


async function submitTemporaryRevocation(event) {
  event.preventDefault();

  const walletAddress =
    studentWalletInput.value.trim().toLowerCase();

  const reason =
    document.getElementById("revocationReason").value.trim();

  if (!walletAddress) {
    showTemporaryRevokeMessage(
      "Enter the student's wallet address.",
      "error"
    );

    return;
  }

  try {
    const duration = getDurationValues();
    validateDuration(duration);

    const confirmed = window.confirm(
      `Temporarily revoke the token for wallet ${walletAddress}?`
    );

    if (!confirmed) {
      return;
    }

    temporaryRevokeButton.disabled = true;
    temporaryRevokeButton.textContent =
      "Submitting Blockchain Transaction...";

    showTemporaryRevokeMessage(
      "Sending temporary revocation transaction to Sepolia..."
    );

    const response = await fetch(
      `${API_BASE_URL}/admin/temporary-revoke`,
      {
        method: "POST",

        headers: getAuthorizationHeaders(),

        body: JSON.stringify({
          wallet_address: walletAddress,
          months: duration.months,
          days: duration.days,
          hours: duration.hours,
          minutes: duration.minutes,
          reason:
            reason || "Temporary revocation by university administrator"
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.detail || "Temporary revocation failed."
      );
    }

    const transactionElement =
      document.getElementById("revocationTransactionHash");

    transactionElement.textContent =
      shortenValue(data.tx_hash);

    transactionElement.title =
      data.tx_hash;

    showTemporaryRevokeMessage(
      `Token temporarily revoked successfully for ${data.duration_seconds} seconds.`,
      "success"
    );

    await checkStudentVerification();

  } catch (error) {
    console.error("Temporary revocation error:", error);

    showTemporaryRevokeMessage(
      error.message || "Temporary revocation failed.",
      "error"
    );

  } finally {
    temporaryRevokeButton.disabled = false;
    temporaryRevokeButton.textContent =
      "Temporarily Revoke Token";
  }
}


async function checkStudentVerification() {
  const walletAddress =
    studentWalletInput.value.trim().toLowerCase();

  if (!walletAddress) {
    showVerificationStatus(
      "Enter the student wallet address first.",
      "error"
    );

    return;
  }

  showVerificationStatus(
    "Checking current blockchain verification status..."
  );

  try {
    const response = await fetch(
      `${API_BASE_URL}/verify/${walletAddress}`
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.detail || "Unable to verify the student token."
      );
    }

    const walletElement =
      document.getElementById("verificationWallet");

    walletElement.textContent =
      shortenValue(data.wallet_address);

    walletElement.title =
      data.wallet_address;

    const validityElement =
      document.getElementById("currentValidity");

    validityElement.textContent =
      data.is_valid ? "Valid" : "Temporarily Invalid";

    validityElement.className =
      data.is_valid
        ? "text-success"
        : "text-danger";

    const remainingTime =
      data.remaining_revocation_time;

    document.getElementById("remainingRevocationTime").textContent =
      typeof remainingTime === "object"
        ? formatRevocationTime(remainingTime)
        : `${remainingTime || 0} seconds`;

    if (data.is_valid) {
      showVerificationStatus(
        "The student's digital identity is currently valid.",
        "success"
      );
    } else {
      showVerificationStatus(
        "The student's digital identity is temporarily revoked.",
        "error"
      );
    }

  } catch (error) {
    console.error("Verification error:", error);

    showVerificationStatus(
      error.message || "Verification failed.",
      "error"
    );
  }
}


function toggleAutomaticMonitoring() {
  if (verificationInterval) {
    clearInterval(verificationInterval);
    verificationInterval = null;

    startMonitoringButton.textContent =
      "Start Auto Monitoring";

    showVerificationStatus(
      "Automatic monitoring stopped."
    );

    return;
  }

  const walletAddress =
    studentWalletInput.value.trim();

  if (!walletAddress) {
    showVerificationStatus(
      "Enter the wallet address before starting monitoring.",
      "error"
    );

    return;
  }

  checkStudentVerification();

  verificationInterval = setInterval(
    checkStudentVerification,
    10000
  );

  startMonitoringButton.textContent =
    "Stop Auto Monitoring";

  showVerificationStatus(
    "Automatic verification monitoring started. Status refreshes every 10 seconds."
  );
}


document
  .getElementById("topLogoutButton")
  .addEventListener("click", logoutAdmin);

document
  .getElementById("sidebarLogoutButton")
  .addEventListener("click", logoutAdmin);

temporaryRevokeForm.addEventListener(
  "submit",
  submitTemporaryRevocation
);

checkVerificationButton.addEventListener(
  "click",
  checkStudentVerification
);

startMonitoringButton.addEventListener(
  "click",
  toggleAutomaticMonitoring
);


verifyAdminSession();