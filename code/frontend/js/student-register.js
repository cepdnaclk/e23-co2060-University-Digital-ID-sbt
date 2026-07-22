
const API_BASE_URL = "http://127.0.0.1:8000";

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


function showRegistrationStatus(message, type = "") {
  registrationStatus.textContent = message;
  registrationStatus.className = `status ${type}`;
}


function setRegistrationLoading(isLoading) {
  registrationButton.disabled = isLoading;
  connectWalletButton.disabled = isLoading;

  registrationButton.textContent = isLoading
    ? "Submitting Registration..."
    : "Submit Registration";
}


async function connectStudentWallet() {
  if (!window.ethereum) {
    showRegistrationStatus(
      "MetaMask is not installed. Please install MetaMask first.",
      "error"
    );

    return;
  }

  try {
    showRegistrationStatus(
      "Waiting for MetaMask wallet connection..."
    );

    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts"
    });

    if (!accounts || accounts.length === 0) {
      throw new Error("No MetaMask account was selected.");
    }

    const walletAddress = accounts[0].toLowerCase();

    walletAddressInput.value = walletAddress;

    showRegistrationStatus(
      `Wallet connected: ${walletAddress}`,
      "success"
    );

  } catch (error) {
    console.error("MetaMask connection error:", error);

    showRegistrationStatus(
      error.message || "Unable to connect MetaMask wallet.",
      "error"
    );
  }
}


async function registerStudent(event) {
  event.preventDefault();

  const walletAddress = walletAddressInput.value.trim();

  if (!walletAddress) {
    showRegistrationStatus(
      "Please connect your MetaMask wallet before registering.",
      "error"
    );

    return;
  }

  const registrationData = {
    wallet_address: walletAddress,

    full_name:
      document.getElementById("fullName").value.trim(),

    student_number:
      document.getElementById("studentNumber").value.trim(),

    faculty:
      document.getElementById("faculty").value.trim(),

    department:
      document.getElementById("department").value.trim(),

    batch:
      document.getElementById("batch").value.trim(),

    academic_year:
      document.getElementById("academicYear").value,

    email:
      document.getElementById("universityEmail").value.trim(),

    phone:
      document.getElementById("phone").value.trim() || null
  };

  setRegistrationLoading(true);

  showRegistrationStatus(
    "Submitting registration to the university system..."
  );

  try {
    const response = await fetch(
      `${API_BASE_URL}/auth/register`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify(registrationData)
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.detail || "Student registration failed."
      );
    }

    sessionStorage.setItem(
      "registeredStudentWallet",
      data.wallet_address
    );

    sessionStorage.setItem(
      "registeredStudentId",
      String(data.user_id)
    );

    sessionStorage.setItem(
      "registeredStudentStatus",
      data.status
    );

    sessionStorage.setItem(
      "registeredStudentNumber",
      data.student_number
    );

    sessionStorage.setItem(
      "registeredStudentName",
      data.full_name
    );

    showRegistrationStatus(
      "Registration submitted successfully. Your account is pending university approval.",
      "success"
    );

    setTimeout(() => {
      window.location.href = "registration-success.html";
    }, 1200);

  } catch (error) {
    console.error("Student registration error:", error);

    showRegistrationStatus(
      error.message || "Unable to connect to the backend.",
      "error"
    );

  } finally {
    setRegistrationLoading(false);
  }
}


connectWalletButton.addEventListener(
  "click",
  connectStudentWallet
);

registrationForm.addEventListener(
  "submit",
  registerStudent
);


if (window.ethereum) {
  window.ethereum.on("accountsChanged", (accounts) => {
    if (!accounts || accounts.length === 0) {
      walletAddressInput.value = "";

      showRegistrationStatus(
        "MetaMask wallet disconnected.",
        "error"
      );

      return;
    }

    walletAddressInput.value = accounts[0].toLowerCase();

    showRegistrationStatus(
      "Connected MetaMask account changed.",
      "success"
    );
  });
}
