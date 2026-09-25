const API_BASE_URL = window.PeraSoulUtils.apiBaseUrl();
const adminToken = sessionStorage.getItem("adminAccessToken");

const form = document.getElementById("replaceWalletForm");
const button = document.getElementById("replaceWalletButton");
const messageEl = document.getElementById("replaceWalletMessage");

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
    document.getElementById("replaceStudentUserId").value = userId;
  }

  if (wallet && window.PeraSoulUtils.isEthereumAddress(wallet)) {
    const oldWallet = document.getElementById("oldWalletAddress");
    oldWallet.value = wallet;
    oldWallet.readOnly = true;
  }
}

function renderResult(data) {
  document.getElementById("oldTokenIdResult").textContent =
    data.old_token_id ?? "-";
  document.getElementById("newTokenIdResult").textContent =
    data.new_token_id ?? "-";

  const oldWallet = document.getElementById("oldWalletResult");
  oldWallet.textContent =
    window.PeraSoulUtils.shortenValue(data.old_wallet);
  oldWallet.title = data.old_wallet || "";

  const newWallet = document.getElementById("newWalletResult");
  newWallet.textContent =
    window.PeraSoulUtils.shortenValue(data.new_wallet);
  newWallet.title = data.new_wallet || "";

  const tx = document.getElementById("replacementTxHash");
  tx.textContent = window.PeraSoulUtils.shortenValue(data.tx_hash);
  tx.title = data.tx_hash || "";
}

async function submitReplacement(event) {
  event.preventDefault();

  const studentUserId =
    Number(document.getElementById("replaceStudentUserId").value);
  const oldWallet =
    document.getElementById("oldWalletAddress").value.trim().toLowerCase();
  const newWallet =
    document.getElementById("newWalletAddress").value.trim().toLowerCase();
  const reason =
    document.getElementById("walletReplacementReason").value.trim();

  if (!Number.isInteger(studentUserId) || studentUserId <= 0) {
    showMessage("Enter a valid student user ID.", "error");
    return;
  }

  if (!window.PeraSoulUtils.isEthereumAddress(newWallet)) {
    showMessage("Enter a valid new Ethereum wallet address.", "error");
    return;
  }

  if (oldWallet &&
      window.PeraSoulUtils.isEthereumAddress(oldWallet) &&
      oldWallet === newWallet) {
    showMessage("The old and new wallet addresses cannot be the same.", "error");
    return;
  }

  if (reason.length < 3) {
    showMessage("Enter a meaningful wallet replacement reason.", "error");
    return;
  }

  if (!window.confirm(
    "The current identity token will be replaced and a new token will be issued to the new wallet. Continue?"
  )) return;

  button.disabled = true;
  button.textContent = "Submitting Sepolia Transaction...";

  try {
    showMessage("Waiting for wallet replacement confirmation...");

    const response = await fetch(
      `${API_BASE_URL}/admin/replace-wallet/${studentUserId}`,
      {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          new_wallet: newWallet,
          reason
        })
      }
    );
    const data = await window.PeraSoulUtils.jsonResponse(response);

    renderResult(data);
    showMessage(
      `Wallet replaced successfully. New Token ID: ${data.new_token_id ?? "-"}.`,
      "success"
    );

    button.disabled = true;
    button.textContent = "Wallet Replaced";
  } catch (error) {
    showMessage(error.message || "Wallet replacement failed.", "error");
    button.disabled = false;
    button.textContent = "Replace Wallet and Reissue Identity";
  }
}

document.getElementById("topLogoutButton")
  ?.addEventListener("click", logoutAdmin);
document.getElementById("sidebarLogoutButton")
  ?.addEventListener("click", logoutAdmin);
form?.addEventListener("submit", submitReplacement);

(async () => {
  showMessage("Verifying administrator session...");
  if (!(await verifyAdminSession())) return;
  loadQueryContext();
  showMessage("Administrator session verified.", "success");
})();
