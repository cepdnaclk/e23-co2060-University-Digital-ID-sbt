const API_BASE_URL = window.PeraSoulUtils.apiBaseUrl();
const adminToken = sessionStorage.getItem("adminAccessToken");

const form = document.getElementById("temporaryRevokeForm");
const submitButton = document.getElementById("temporaryRevokeButton");
const pageMessage = document.getElementById("temporaryRevokeMessage");
const walletInput = document.getElementById("studentWalletAddress");

let verificationInterval = null;

function headers() {
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${adminToken}`
  };
}

function showMessage(message, type = "") {
  if (!pageMessage) return;
  pageMessage.textContent = message;
  pageMessage.className = `status ${type}`;
}

function showVerification(message, type = "") {
  const el = document.getElementById("verificationStatus");
  if (!el) return;
  el.textContent = message;
  el.className = `status ${type}`;
}

function formatRemaining(seconds) {
  let remaining = Math.max(0, Number(seconds || 0));
  const days = Math.floor(remaining / 86400);
  remaining %= 86400;
  const hours = Math.floor(remaining / 3600);
  remaining %= 3600;
  const minutes = Math.floor(remaining / 60);
  const secs = remaining % 60;

  const parts = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (!parts.length && secs) parts.push(`${secs}s`);
  return parts.length ? parts.join(" ") : "No active revocation";
}

function logoutAdmin() {
  if (verificationInterval) clearInterval(verificationInterval);
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

function durationPayload() {
  const payload = {
    months: Number(document.getElementById("revokeMonths")?.value || 0),
    days: Number(document.getElementById("revokeDays")?.value || 0),
    hours: Number(document.getElementById("revokeHours")?.value || 0),
    minutes: Number(document.getElementById("revokeMinutes")?.value || 0)
  };

  if (Object.values(payload).some((value) => value < 0)) {
    throw new Error("Revocation duration values cannot be negative.");
  }

  if (Object.values(payload).every((value) => value === 0)) {
    throw new Error("Revocation duration must be greater than zero.");
  }

  return payload;
}

async function checkStudentVerification() {
  const wallet = walletInput.value.trim().toLowerCase();

  if (!window.PeraSoulUtils.isEthereumAddress(wallet)) {
    showVerification("Enter a valid Ethereum wallet address.", "error");
    return;
  }

  try {
    showVerification("Checking current blockchain validity...");

    const response = await fetch(
      `${API_BASE_URL}/verify/${encodeURIComponent(wallet)}`
    );
    const data = await window.PeraSoulUtils.jsonResponse(response);

    const walletEl = document.getElementById("verificationWallet");
    if (walletEl) {
      walletEl.textContent = window.PeraSoulUtils.shortenValue(wallet);
      walletEl.title = wallet;
    }

    const validEl = document.getElementById("currentValidity");
    if (validEl) {
      validEl.textContent = data.is_valid ? "Valid" : "Not Valid";
      validEl.className = data.is_valid ? "text-success" : "text-danger";
    }

    const remaining = Number(data.remaining_revocation_time || 0);
    const remainingEl = document.getElementById("remainingRevocationTime");
    if (remainingEl) remainingEl.textContent = formatRemaining(remaining);

    showVerification(
      data.is_valid
        ? "Identity is currently valid on-chain."
        : remaining > 0
          ? "Identity is temporarily revoked."
          : "Identity is not currently valid.",
      data.is_valid ? "success" : "error"
    );
  } catch (error) {
    showVerification(error.message || "Unable to verify identity.", "error");
  }
}

async function submitTemporaryRevocation(event) {
  event.preventDefault();

  const wallet = walletInput.value.trim().toLowerCase();
  const reason =
    document.getElementById("revocationReason")?.value.trim() || "";

  if (!window.PeraSoulUtils.isEthereumAddress(wallet)) {
    showMessage("Enter a valid student Ethereum wallet address.", "error");
    return;
  }

  let duration;
  try {
    duration = durationPayload();
  } catch (error) {
    showMessage(error.message, "error");
    return;
  }

  if (!window.confirm(
    `Temporarily revoke the Digital Student ID for ${wallet}?`
  )) return;

  submitButton.disabled = true;
  submitButton.textContent = "Submitting Sepolia Transaction...";

  try {
    showMessage("Waiting for the temporary revocation transaction...");

    const response = await fetch(`${API_BASE_URL}/admin/temporary-revoke`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        wallet_address: wallet,
        ...duration,
        reason: reason || "Temporary revocation by university administrator"
      })
    });
    const data = await window.PeraSoulUtils.jsonResponse(response);

    const tx = document.getElementById("revocationTransactionHash");
    if (tx) {
      tx.textContent = window.PeraSoulUtils.shortenValue(data.tx_hash);
      tx.title = data.tx_hash || "";
    }

    showMessage(
      `Temporary revocation confirmed for ${data.duration_seconds} seconds.`,
      "success"
    );

    await checkStudentVerification();
  } catch (error) {
    showMessage(error.message || "Temporary revocation failed.", "error");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Temporarily Revoke Token";
  }
}

function startMonitoring() {
  if (verificationInterval) {
    clearInterval(verificationInterval);
    verificationInterval = null;
    document.getElementById("startMonitoringButton").textContent =
      "Start Monitoring";
    showVerification("Automatic verification monitoring stopped.");
    return;
  }

  if (!window.PeraSoulUtils.isEthereumAddress(
    walletInput.value.trim()
  )) {
    showVerification("Enter a valid wallet before monitoring.", "error");
    return;
  }

  checkStudentVerification();
  verificationInterval = setInterval(checkStudentVerification, 5000);
  document.getElementById("startMonitoringButton").textContent =
    "Stop Monitoring";
  showVerification("Monitoring identity validity every 5 seconds.");
}

document.getElementById("topLogoutButton")
  ?.addEventListener("click", logoutAdmin);
document.getElementById("sidebarLogoutButton")
  ?.addEventListener("click", logoutAdmin);
document.getElementById("checkVerificationButton")
  ?.addEventListener("click", checkStudentVerification);
document.getElementById("startMonitoringButton")
  ?.addEventListener("click", startMonitoring);
form?.addEventListener("submit", submitTemporaryRevocation);

(async () => {
  showMessage("Verifying administrator session...");
  if (!(await verifyAdminSession())) return;

  const params = new URLSearchParams(window.location.search);
  const wallet = params.get("wallet");
  if (wallet && window.PeraSoulUtils.isEthereumAddress(wallet)) {
    walletInput.value = wallet;
    await checkStudentVerification();
  }

  showMessage("Administrator session verified.", "success");
})();
