const API_BASE_URL = window.PeraSoulUtils.apiBaseUrl();

const registrationForm =
  document.getElementById("studentRegistrationForm");
const connectWalletButton =
  document.getElementById("connectWalletButton");
const registrationButton =
  document.getElementById("registrationButton");
const registrationStatus =
  document.getElementById("registrationStatus");
const walletAddressInput =
  document.getElementById("walletAddress");

function showStatus(message, type = "") {
  registrationStatus.textContent = message;
  registrationStatus.className = `status ${type}`;
}

function setLoading(isLoading) {
  registrationButton.disabled = isLoading;
  connectWalletButton.disabled = isLoading;
  registrationButton.textContent = isLoading
    ? "Submitting Registration..."
    : "Submit Registration";
}

async function connectStudentWallet() {
  if (!window.ethereum) {
    showStatus(
      "MetaMask is not installed. Install MetaMask before registration.",
      "error"
    );
    return;
  }

  try {
    showStatus("Waiting for MetaMask wallet connection...");

    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts"
    });

    if (!accounts?.length) {
      throw new Error("No MetaMask account was selected.");
    }

    walletAddressInput.value = accounts[0].toLowerCase();
    showStatus(
      `Wallet connected: ${window.PeraSoulUtils.shortenValue(
        walletAddressInput.value
      )}`,
      "success"
    );
  } catch (error) {
    showStatus(
      error.code === 4001
        ? "MetaMask connection was cancelled."
        : (error.message || "Unable to connect MetaMask."),
      "error"
    );
  }
}

async function registerStudent(event) {
  event.preventDefault();

  const wallet = walletAddressInput.value.trim().toLowerCase();

  if (!window.PeraSoulUtils.isEthereumAddress(wallet)) {
    showStatus("Connect a valid MetaMask wallet before registering.", "error");
    return;
  }

  const payload = {
    wallet_address: wallet,
    full_name: document.getElementById("fullName").value.trim(),
    student_number: document.getElementById("studentNumber").value.trim(),
    faculty: document.getElementById("faculty").value.trim(),
    department: document.getElementById("department").value.trim(),
    batch: document.getElementById("batch").value.trim(),
    academic_year: document.getElementById("academicYear").value,
    email: document.getElementById("universityEmail").value.trim().toLowerCase(),
    phone: document.getElementById("phone").value.trim() || null
  };

  setLoading(true);
  showStatus("Submitting registration to the university system...");

  try {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(payload)
    });
    const data = await window.PeraSoulUtils.jsonResponse(response);

    sessionStorage.setItem("registeredStudentWallet", data.wallet_address);
    sessionStorage.setItem("registeredStudentId", String(data.user_id));
    sessionStorage.setItem("registeredStudentStatus", data.status);
    sessionStorage.setItem(
      "registeredStudentNumber",
      data.student_number
    );
    sessionStorage.setItem("registeredStudentName", data.full_name);

    showStatus(
      "Registration submitted successfully. Your account is pending university approval.",
      "success"
    );

    setTimeout(() => {
      window.location.href = "registration-success.html";
    }, 800);
  } catch (error) {
    showStatus(error.message || "Student registration failed.", "error");
  } finally {
    setLoading(false);
  }
}

connectWalletButton?.addEventListener("click", connectStudentWallet);
registrationForm?.addEventListener("submit", registerStudent);

if (window.ethereum) {
  window.ethereum.on("accountsChanged", (accounts) => {
    walletAddressInput.value = accounts?.length
      ? accounts[0].toLowerCase()
      : "";

    showStatus(
      accounts?.length
        ? "Connected MetaMask account changed."
        : "MetaMask wallet disconnected.",
      accounts?.length ? "" : "error"
    );
  });
}
