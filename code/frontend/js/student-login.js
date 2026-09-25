const API_BASE_URL =
  window.PeraSoulUtils
    ? window.PeraSoulUtils.apiBaseUrl()
    : "http://127.0.0.1:8000";


const studentLoginForm =
  document.getElementById(
    "studentLoginForm"
  );

const connectLoginWalletButton =
  document.getElementById(
    "connectLoginWalletButton"
  );

const studentLoginButton =
  document.getElementById(
    "studentLoginButton"
  );

const studentLoginStatus =
  document.getElementById(
    "studentLoginStatus"
  );

const loginWalletInput =
  document.getElementById(
    "loginWallet"
  );


let connectedStudentWallet = "";


// ==========================================================
// STATUS MESSAGE
// ==========================================================

function showStudentLoginStatus(
  message,
  type = ""
) {

  if (!studentLoginStatus) {
    return;
  }

  studentLoginStatus.textContent =
    message;

  studentLoginStatus.className =
    `status ${type}`;
}


// ==========================================================
// LOADING STATE
// ==========================================================

function setLoginLoading(
  isLoading
) {

  if (connectLoginWalletButton) {
    connectLoginWalletButton.disabled =
      isLoading;
  }


  if (studentLoginButton) {

    studentLoginButton.disabled =
      isLoading
      || !connectedStudentWallet;

    studentLoginButton.textContent =
      isLoading
        ? "Verifying Wallet..."
        : "Sign Message and Login";
  }
}


// ==========================================================
// CLEAR STUDENT LOGIN SESSION
// ==========================================================

function clearStudentLoginSession() {

  if (
    window.PeraSoulUtils
    && window.PeraSoulUtils
      .clearStudentSession
  ) {

    window.PeraSoulUtils
      .clearStudentSession();

    return;
  }


  sessionStorage.removeItem(
    "studentWalletAddress"
  );

  sessionStorage.removeItem(
    "studentUserId"
  );

  sessionStorage.removeItem(
    "studentRole"
  );

  sessionStorage.removeItem(
    "studentAccountStatus"
  );
}


// ==========================================================
// CONNECT / SELECT METAMASK WALLET
// ==========================================================

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
      "Select your registered student wallet in MetaMask..."
    );


    // ------------------------------------------------------
    // Force MetaMask to show account permission/selection
    // instead of silently reusing the currently connected
    // wallet.
    // ------------------------------------------------------

    try {

      await window.ethereum.request({
        method:
          "wallet_requestPermissions",

        params: [
          {
            eth_accounts: {}
          }
        ]
      });


    } catch (permissionError) {

      if (
        permissionError.code === 4001
      ) {

        throw new Error(
          "MetaMask account selection was cancelled."
        );
      }


      // Some wallet/browser combinations may not support
      // wallet_requestPermissions. In that case continue
      // with eth_requestAccounts.
      console.warn(
        "wallet_requestPermissions unavailable:",
        permissionError
      );
    }


    // ------------------------------------------------------
    // Get selected MetaMask account
    // ------------------------------------------------------

    const accounts =
      await window.ethereum.request({
        method:
          "eth_requestAccounts"
      });


    if (
      !accounts
      || accounts.length === 0
    ) {

      throw new Error(
        "No MetaMask account was selected."
      );
    }


    connectedStudentWallet =
      accounts[0].toLowerCase();


    loginWalletInput.value =
      connectedStudentWallet;


    if (studentLoginButton) {
      studentLoginButton.disabled =
        false;
    }


    showStudentLoginStatus(
      `Student wallet selected: ${
        window.PeraSoulUtils
          ? window.PeraSoulUtils
              .shortenValue(
                connectedStudentWallet
              )
          : connectedStudentWallet
      }`,
      "success"
    );


  } catch (error) {

    connectedStudentWallet =
      "";

    loginWalletInput.value =
      "";

    if (studentLoginButton) {
      studentLoginButton.disabled =
        true;
    }


    console.error(
      "Wallet connection error:",
      error
    );


    showStudentLoginStatus(
      error.message
      || "Unable to connect MetaMask wallet.",
      "error"
    );
  }
}


// ==========================================================
// REQUEST LOGIN NONCE
// ==========================================================

async function requestLoginNonce(
  walletAddress
) {

  const response =
    await fetch(
      `${API_BASE_URL}/auth/nonce`,
      {
        method:
          "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body:
          JSON.stringify({
            wallet_address:
              walletAddress
          })
      }
    );


  if (
    window.PeraSoulUtils
    && window.PeraSoulUtils
      .jsonResponse
  ) {

    const data =
      await window.PeraSoulUtils
        .jsonResponse(response);

    return data.message;
  }


  const data =
    await response.json();


  if (!response.ok) {

    throw new Error(
      data.detail
      || "Unable to generate login message."
    );
  }


  return data.message;
}


// ==========================================================
// SIGN LOGIN MESSAGE
// ==========================================================

async function signLoginMessage(
  walletAddress,
  loginMessage
) {

  return window.ethereum.request({
    method:
      "personal_sign",

    params: [
      loginMessage,
      walletAddress
    ]
  });
}


// ==========================================================
// VERIFY LOGIN SIGNATURE
// ==========================================================

async function verifyLoginSignature(
  walletAddress,
  signature
) {

  const response =
    await fetch(
      `${API_BASE_URL}/auth/verify-signature`,
      {
        method:
          "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body:
          JSON.stringify({
            wallet_address:
              walletAddress,

            signature:
              signature
          })
      }
    );


  if (
    window.PeraSoulUtils
    && window.PeraSoulUtils
      .jsonResponse
  ) {

    return window.PeraSoulUtils
      .jsonResponse(response);
  }


  const data =
    await response.json();


  if (!response.ok) {

    throw new Error(
      data.detail
      || "Wallet signature verification failed."
    );
  }


  return data;
}


// ==========================================================
// STUDENT LOGIN
// ==========================================================

async function loginStudent(
  event
) {

  event.preventDefault();


  const walletAddress =
    connectedStudentWallet
    || loginWalletInput.value
      .trim()
      .toLowerCase();


  if (!walletAddress) {

    showStudentLoginStatus(
      "Please select your registered MetaMask wallet first.",
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


  setLoginLoading(
    true
  );


  try {

    // ------------------------------------------------------
    // Ensure the currently selected MetaMask account still
    // matches the wallet shown on the login page.
    // ------------------------------------------------------

    const currentAccounts =
      await window.ethereum.request({
        method:
          "eth_accounts"
      });


    if (
      !currentAccounts
      || currentAccounts.length === 0
    ) {

      throw new Error(
        "MetaMask wallet is not connected."
      );
    }


    const currentWallet =
      currentAccounts[0]
        .toLowerCase();


    if (
      currentWallet !==
      walletAddress
    ) {

      throw new Error(
        "The selected MetaMask account changed. Please connect the correct student wallet again."
      );
    }


    // ------------------------------------------------------
    // Request secure nonce message
    // ------------------------------------------------------

    showStudentLoginStatus(
      "Requesting a secure login message..."
    );


    const loginMessage =
      await requestLoginNonce(
        walletAddress
      );


    // ------------------------------------------------------
    // Sign message
    // ------------------------------------------------------

    showStudentLoginStatus(
      "Please approve the signature request in MetaMask."
    );


    const signature =
      await signLoginMessage(
        walletAddress,
        loginMessage
      );


    // ------------------------------------------------------
    // Backend signature verification
    // ------------------------------------------------------

    showStudentLoginStatus(
      "Verifying your wallet signature..."
    );


    const loginResult =
      await verifyLoginSignature(
        walletAddress,
        signature
      );


    if (
      loginResult.role !==
      "student"
    ) {

      throw new Error(
        "This wallet is not registered as a student account."
      );
    }


    // ------------------------------------------------------
    // Save session
    // ------------------------------------------------------

    clearStudentLoginSession();


    sessionStorage.setItem(
      "studentWalletAddress",
      loginResult.wallet_address
    );


    sessionStorage.setItem(
      "studentUserId",
      String(
        loginResult.user_id
      )
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


    setTimeout(
      () => {

        window.location.href =
          "student-dashboard.html";

      },
      1000
    );


  } catch (error) {

    console.error(
      "Student login error:",
      error
    );


    if (
      error.code === 4001
    ) {

      showStudentLoginStatus(
        "The MetaMask signature request was rejected.",
        "error"
      );

    } else {

      showStudentLoginStatus(
        error.message
        || "Student login failed.",
        "error"
      );
    }


  } finally {

    setLoginLoading(
      false
    );
  }
}


// ==========================================================
// METAMASK ACCOUNT CHANGES
// ==========================================================

function handleStudentAccountChange(
  accounts
) {

  clearStudentLoginSession();


  if (
    !accounts
    || accounts.length === 0
  ) {

    connectedStudentWallet =
      "";

    loginWalletInput.value =
      "";

    if (studentLoginButton) {
      studentLoginButton.disabled =
        true;
    }


    showStudentLoginStatus(
      "MetaMask wallet disconnected.",
      "error"
    );


    return;
  }


  connectedStudentWallet =
    accounts[0].toLowerCase();


  loginWalletInput.value =
    connectedStudentWallet;


  if (studentLoginButton) {
    studentLoginButton.disabled =
      false;
  }


  showStudentLoginStatus(
    "MetaMask account changed. Sign in using the newly selected student wallet.",
    "success"
  );
}


// ==========================================================
// EVENT LISTENERS
// ==========================================================

connectLoginWalletButton
  ?.addEventListener(
    "click",
    connectLoginWallet
  );


studentLoginForm
  ?.addEventListener(
    "submit",
    loginStudent
  );


if (window.ethereum) {

  window.ethereum.on(
    "accountsChanged",
    handleStudentAccountChange
  );
}


// ==========================================================
// INITIAL STATE
// ==========================================================

connectedStudentWallet =
  "";

loginWalletInput.value =
  "";

if (studentLoginButton) {
  studentLoginButton.disabled =
    true;
}