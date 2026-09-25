const studentWallet =
  sessionStorage.getItem("studentWalletAddress");

const currentWalletInput =
  document.getElementById("currentStudentWallet");
const statusEl =
  document.getElementById("walletRecoveryStatus");
const form =
  document.getElementById("walletRecoveryForm");
const button =
  document.getElementById("walletRecoveryButton");

function showStatus(message, type = "") {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
}

function logoutStudent() {
  window.PeraSoulUtils.clearStudentSession();
  window.location.href = "student-login.html";
}

if (currentWalletInput) {
  currentWalletInput.value = studentWallet || "";
}

form?.addEventListener("submit", (event) => {
  event.preventDefault();

  const newWallet =
    document.getElementById("replacementWalletAddress").value.trim();
  const reason =
    document.getElementById("walletRecoveryReason").value.trim();

  if (!window.PeraSoulUtils.isEthereumAddress(newWallet)) {
    showStatus("Enter a valid proposed replacement wallet.", "error");
    return;
  }

  if (studentWallet &&
      newWallet.toLowerCase() === studentWallet.toLowerCase()) {
    showStatus("The replacement wallet must be different from the current wallet.", "error");
    return;
  }

  // No student-side wallet-recovery API is exposed by the current backend.
  // Do not pretend the request has been saved.
  showStatus(
    "Replacement details are valid. The finalized MVP performs wallet replacement through an authorized University Administrator; this form does not submit or change blockchain state.",
    "success"
  );

  button.disabled = true;
  button.textContent = "Administrator Review Required";

  console.info("Wallet recovery guidance:", {
    proposed_new_wallet: newWallet,
    reason_provided: Boolean(reason)
  });
});

document.getElementById("topStudentLogoutButton")
  ?.addEventListener("click", logoutStudent);
document.getElementById("sidebarStudentLogoutButton")
  ?.addEventListener("click", logoutStudent);

if (!studentWallet) {
  showStatus(
    "If your previous wallet is inaccessible, contact an authorized University Administrator for identity verification and wallet replacement.",
    ""
  );
} else {
  showStatus(
    "Enter the proposed new wallet to validate the replacement details. An administrator must perform the actual replacement."
  );
}
