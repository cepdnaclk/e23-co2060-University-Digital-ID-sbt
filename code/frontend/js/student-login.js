const API_BASE_URL = "http://127.0.0.1:8000";

const studentLoginForm =
  document.getElementById("studentLoginForm");

const connectLoginWalletButton =
  document.getElementById("connectLoginWalletButton");

const studentLoginButton =
  document.getElementById("studentLoginButton");

const studentLoginStatus =
  document.getElementById("studentLoginStatus");

const loginWalletInput =
  document.getElementById("loginWallet");


function showStudentLoginStatus(message, type = "") {
  studentLoginStatus.textContent = message;
  studentLoginStatus.className = `status ${type}`;
}


function setLoginLoading(isLoading) {
  connectLoginWalletButton.disabled = isLoading;
  studentLoginButton.disabled = isLoading;

  studentLoginButton.textContent = isLoading
    ? "Verifying Wallet..."
    : "Sign Message and Login";
}


async function connectLoginWallet() {
  if (!window.ethereum) {
    showStudentLoginStatus(
      "MetaMask is not installed. Please install MetaMask first.",
      "error"
    );

    return;
  }

  try {
    showStudentLoginStatus(
      "Waiting for MetaMask wallet connection..."
    );

    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts"
    });

    if (!accounts || accounts.length === 0) {
      throw new Error("No MetaMask account was selected.");
    }

    const walletAddress = accounts[0].toLowerCase();

    loginWalletInput.value = walletAddress;

    showStudentLoginStatus(
      `Wallet connected: ${walletAddress}`,
      "success"
    );

  } catch (error) {
    console.error("Wallet connection error:", error);

    showStudentLoginStatus(
      error.message || "Unable to connect MetaMask wallet.",
      "error"
    );
  }
}


async function requestLoginNonce(walletAddress) {
  const response = await fetch(
    `${API_BASE_URL}/auth/nonce`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        wallet_address: walletAddress
      })
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.detail || "Unable to generate login message."
    );
  }

  return data.message;
}


async function signLoginMessage(walletAddress, loginMessage) {
  return await window.ethereum.request({
    method: "personal_sign",
    params: [
      loginMessage,
      walletAddress
    ]
  });
}


async function verifyLoginSignature(walletAddress, signature) {
  const response = await fetch(
    `${API_BASE_URL}/auth/verify-signature`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        wallet_address: walletAddress,
        signature: signature
      })
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.detail || "Wallet signature verification failed."
    );
  }

  return data;
}


async function loginStudent(event) {
  event.preventDefault();

  const walletAddress =
    loginWalletInput.value.trim().toLowerCase();

  if (!walletAddress) {
    showStudentLoginStatus(
      "Please connect your MetaMask wallet first.",
      "error"
    );

    return;
  }

  if (!window.ethereum) {
    showStudentLoginStatus(
      "MetaMask is not available.",
      "error"
    );

    return;
  }

  setLoginLoading(true);

  try {
    showStudentLoginStatus(
      "Requesting a secure login message..."
    );

    const loginMessage =
      await requestLoginNonce(walletAddress);

    showStudentLoginStatus(
      "Please approve the signature request in MetaMask."
    );

    const signature = await signLoginMessage(
      walletAddress,
      loginMessage
    );

    showStudentLoginStatus(
      "Verifying your wallet signature..."
    );

    const loginResult = await verifyLoginSignature(
      walletAddress,
      signature
    );

    if (loginResult.role !== "student") {
      throw new Error(
        "This wallet is not registered as a student account."
      );
    }

    sessionStorage.setItem(
      "studentWalletAddress",
      loginResult.wallet_address
    );

    sessionStorage.setItem(
      "studentUserId",
      String(loginResult.user_id)
    );

    sessionStorage.setItem(
      "studentRole",
      loginResult.role
    );

    sessionStorage.setItem(
      "studentAccountStatus",
      loginResult.status
    );

    showStudentLoginStatus(
      "Wallet verified successfully. Opening your dashboard...",
      "success"
    );

    setTimeout(() => {
      window.location.href = "student-dashboard.html";
    }, 1000);

  } catch (error) {
    console.error("Student login error:", error);

    if (error.code === 4001) {
      showStudentLoginStatus(
        "The MetaMask signature request was rejected.",
        "error"
      );
    } else {
      showStudentLoginStatus(
        error.message || "Student login failed.",
        "error"
      );
    }

  } finally {
    setLoginLoading(false);
  }
}


connectLoginWalletButton.addEventListener(
  "click",
  connectLoginWallet
);

studentLoginForm.addEventListener(
  "submit",
  loginStudent
);


if (window.ethereum) {
  window.ethereum.on("accountsChanged", (accounts) => {
    sessionStorage.removeItem("studentWalletAddress");
    sessionStorage.removeItem("studentUserId");
    sessionStorage.removeItem("studentRole");
    sessionStorage.removeItem("studentAccountStatus");

    if (!accounts || accounts.length === 0) {
      loginWalletInput.value = "";

      showStudentLoginStatus(
        "MetaMask wallet disconnected.",
        "error"
      );

      return;
    }

    loginWalletInput.value = accounts[0].toLowerCase();

    showStudentLoginStatus(
      "Connected MetaMask account changed. Sign in again.",
      "success"
    );
  });
}