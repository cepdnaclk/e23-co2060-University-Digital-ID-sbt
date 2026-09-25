const API_BASE_URL =
  window.PeraSoulUtils.apiBaseUrl();


const adminLoginForm =
  document.getElementById(
    "adminLoginForm"
  );

const connectAdminWalletButton =
  document.getElementById(
    "connectAdminWalletButton"
  );

const adminLoginButton =
  document.getElementById(
    "adminLoginButton"
  );

const adminWalletAddressInput =
  document.getElementById(
    "adminWalletAddress"
  );

const loginMessage =
  document.getElementById(
    "loginMessage"
  );


let connectedAdminWallet = "";


// ==========================================================
// UI HELPERS
// ==========================================================

function showLoginMessage(
  message,
  type = ""
) {

  if (!loginMessage) return;

  loginMessage.textContent =
    message;

  loginMessage.className =
    `status ${type}`;
}


function setLoading(
  isLoading
) {

  if (connectAdminWalletButton) {
    connectAdminWalletButton.disabled =
      isLoading;
  }

  if (adminLoginButton) {

    adminLoginButton.disabled =
      isLoading
      || !connectedAdminWallet;

    adminLoginButton.textContent =
      isLoading
        ? "Verifying Administrator..."
        : "Sign Message and Login";
  }
}


// ==========================================================
// CONNECT METAMASK
// ==========================================================

async function connectAdminWallet() {

  if (!window.ethereum) {

    showLoginMessage(
      "MetaMask is not installed. Install MetaMask to use the administrator portal.",
      "error"
    );

    return;
  }

  try {

    showLoginMessage(
      "Select an authorized administrator wallet in MetaMask..."
    );


    // ------------------------------------------------------
    // Ask MetaMask to allow account selection again.
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


      // Some wallet/browser combinations may not
      // support wallet_requestPermissions.
      console.warn(
        "wallet_requestPermissions unavailable:",
        permissionError
      );
    }


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


    connectedAdminWallet =
      accounts[0].toLowerCase();


    if (adminWalletAddressInput) {

      adminWalletAddressInput.value =
        connectedAdminWallet;
    }


    if (adminLoginButton) {
      adminLoginButton.disabled =
        false;
    }


    showLoginMessage(
      `Administrator wallet selected: ${
        window.PeraSoulUtils
          .shortenValue(
            connectedAdminWallet
          )
      }`,
      "success"
    );

  } catch (error) {

    connectedAdminWallet = "";


    if (adminWalletAddressInput) {
      adminWalletAddressInput.value =
        "";
    }


    if (adminLoginButton) {
      adminLoginButton.disabled =
        true;
    }


    showLoginMessage(
      error.message
      || "Unable to connect the administrator MetaMask wallet.",
      "error"
    );
  }
}


// ==========================================================
// REQUEST ADMIN NONCE
// ==========================================================

async function requestAdminNonce(
  walletAddress
) {

  const response =
    await fetch(
      `${API_BASE_URL}/admin-auth/nonce`,
      {
        method: "POST",

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


  const data =
    await window.PeraSoulUtils
      .jsonResponse(response);


  if (!data.message) {

    throw new Error(
      "The backend did not return an administrator login message."
    );
  }


  return data.message;
}


// ==========================================================
// SIGN MESSAGE
// ==========================================================

async function signAdminMessage(
  walletAddress,
  message
) {

  return window.ethereum.request({
    method:
      "personal_sign",

    params: [
      message,
      walletAddress
    ]
  });
}


// ==========================================================
// VERIFY SIGNATURE
// ==========================================================

async function verifyAdminSignature(
  walletAddress,
  signature
) {

  const response =
    await fetch(
      `${API_BASE_URL}/admin-auth/verify-signature`,
      {
        method: "POST",

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


  return window.PeraSoulUtils
    .jsonResponse(response);
}


// ==========================================================
// ADMIN LOGIN
// ==========================================================

async function loginAdmin(
  event
) {

  event.preventDefault();


  if (
    !connectedAdminWallet
    || !window.PeraSoulUtils
      .isEthereumAddress(
        connectedAdminWallet
      )
  ) {

    showLoginMessage(
      "Connect a valid authorized MetaMask wallet first.",
      "error"
    );

    return;
  }


  if (!window.ethereum) {

    showLoginMessage(
      "MetaMask is not available.",
      "error"
    );

    return;
  }


  setLoading(true);


  try {

    // ------------------------------------------------------
    // Request one-time login challenge
    // ------------------------------------------------------

    showLoginMessage(
      "Requesting a secure administrator login message..."
    );


    const nonceMessage =
      await requestAdminNonce(
        connectedAdminWallet
      );


    // ------------------------------------------------------
    // Sign challenge
    // ------------------------------------------------------

    showLoginMessage(
      "Approve the signature request in MetaMask. No blockchain transaction will be sent."
    );


    const signature =
      await signAdminMessage(
        connectedAdminWallet,
        nonceMessage
      );


    // ------------------------------------------------------
    // Verify signature
    // ------------------------------------------------------

    showLoginMessage(
      "Verifying administrator wallet signature..."
    );


    const result =
      await verifyAdminSignature(
        connectedAdminWallet,
        signature
      );


    // ------------------------------------------------------
    // Accept supported administrative roles
    // ------------------------------------------------------

    const allowedAdminRoles = [
      "university_admin",
      "technical_admin"
    ];


    if (
      !allowedAdminRoles.includes(
        result.role
      )
    ) {

      throw new Error(
        "This wallet does not have administrator access."
      );
    }


    // ------------------------------------------------------
    // Save authenticated session
    // ------------------------------------------------------

    window.PeraSoulUtils
      .clearAdminSession();


    sessionStorage.setItem(
      "adminAccessToken",
      result.access_token
    );


    sessionStorage.setItem(
      "adminUserId",
      String(
        result.admin_id
      )
    );


    sessionStorage.setItem(
      "adminRole",
      result.role
    );


    sessionStorage.setItem(
      "adminWallet",
      result.wallet_address
    );


    const fallbackName =
      result.role === "technical_admin"
        ? "Technical Administrator"
        : "University Administrator";


    sessionStorage.setItem(
      "adminDisplayName",
      result.display_name
      || fallbackName
    );


    // ------------------------------------------------------
    // Redirect based on role
    // ------------------------------------------------------

    if (
      result.role ===
      "technical_admin"
    ) {

      showLoginMessage(
        "Technical Administrator verified. Opening the Technical Administration dashboard...",
        "success"
      );

    } else {

      showLoginMessage(
        "University Administrator verified. Opening the dashboard...",
        "success"
      );
    }


    setTimeout(
      () => {

        if (
          result.role ===
          "technical_admin"
        ) {

          window.location.href =
            "technical-admin-dashboard.html";

        } else {

          window.location.href =
            "admin-dashboard.html";
        }

      },
      700
    );


  } catch (error) {

    showLoginMessage(
      error.code === 4001
        ? "The MetaMask signature request was rejected."
        : (
            error.message
            || "Administrator login failed."
          ),
      "error"
    );

  } finally {

    setLoading(false);
  }
}


// ==========================================================
// METAMASK ACCOUNT CHANGE
// ==========================================================

function handleAccountsChanged(
  accounts
) {

  window.PeraSoulUtils
    .clearAdminSession();


  if (
    !accounts
    || accounts.length === 0
  ) {

    connectedAdminWallet = "";


    if (adminWalletAddressInput) {
      adminWalletAddressInput.value =
        "";
    }


    if (adminLoginButton) {
      adminLoginButton.disabled =
        true;
    }


    showLoginMessage(
      "MetaMask wallet disconnected.",
      "error"
    );

    return;
  }


  connectedAdminWallet =
    accounts[0].toLowerCase();


  if (adminWalletAddressInput) {

    adminWalletAddressInput.value =
      connectedAdminWallet;
  }


  if (adminLoginButton) {

    adminLoginButton.disabled =
      false;
  }


  showLoginMessage(
    "MetaMask account changed. Sign a new administrator login challenge."
  );
}


// ==========================================================
// EVENT LISTENERS
// ==========================================================

connectAdminWalletButton
  ?.addEventListener(
    "click",
    connectAdminWallet
  );


adminLoginForm
  ?.addEventListener(
    "submit",
    loginAdmin
  );


if (window.ethereum) {

  window.ethereum.on(
    "accountsChanged",
    handleAccountsChanged
  );
}