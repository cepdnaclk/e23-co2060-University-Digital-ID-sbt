const registeredName =
  sessionStorage.getItem("registeredStudentName");

const registeredStudentNumber =
  sessionStorage.getItem("registeredStudentNumber");

const registeredWallet =
  sessionStorage.getItem("registeredStudentWallet");

const registeredUserId =
  sessionStorage.getItem("registeredStudentId");

const registeredStatus =
  sessionStorage.getItem("registeredStudentStatus");


function shortenWallet(walletAddress) {
  if (!walletAddress || walletAddress.length < 12) {
    return walletAddress || "-";
  }

  return `${walletAddress.slice(0, 8)}...${walletAddress.slice(-6)}`;
}


function loadRegistrationSummary() {
  const messageElement =
    document.getElementById("registrationSuccessMessage");

  if (
    !registeredName ||
    !registeredStudentNumber ||
    !registeredWallet
  ) {
    messageElement.textContent =
      "Registration details are not available. Please submit the registration form first.";

    messageElement.className = "status error";

    return;
  }

  document.getElementById("registeredStudentName").textContent =
    registeredName;

  document.getElementById("registeredStudentNumber").textContent =
    registeredStudentNumber;

  const walletElement =
    document.getElementById("registeredStudentWallet");

  walletElement.textContent = shortenWallet(registeredWallet);
  walletElement.title = registeredWallet;

  document.getElementById("registeredStudentId").textContent =
    registeredUserId || "-";

  const statusElement =
    document.getElementById("registeredStudentStatus");

  statusElement.textContent =
    registeredStatus || "pending";

  messageElement.textContent =
    "Registration submitted successfully. Your account is pending university approval.";

  messageElement.className = "status success";
}


loadRegistrationSummary();
