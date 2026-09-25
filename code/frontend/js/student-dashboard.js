const API_BASE_URL = window.PeraSoulUtils.apiBaseUrl();


// ==========================================================
// SESSION INFORMATION
// ==========================================================

const studentWalletAddress =
  sessionStorage.getItem(
    "studentWalletAddress"
  );

const studentRole =
  sessionStorage.getItem(
    "studentRole"
  );


// ==========================================================
// DOM ELEMENTS
// ==========================================================

const dashboardMessage =
  document.getElementById(
    "studentDashboardMessage"
  );

const requestTokenButton =
  document.getElementById(
    "requestTokenButton"
  );


// Header
const loggedStudentName =
  document.getElementById(
    "loggedStudentName"
  );

const loggedStudentWallet =
  document.getElementById(
    "loggedStudentWallet"
  );


// Status badges
const accountStatusBadge =
  document.getElementById(
    "accountStatusBadge"
  );

const profileStatusBadge =
  document.getElementById(
    "profileStatusBadge"
  );

const digitalIdStatusBadge =
  document.getElementById(
    "digitalIdStatusBadge"
  );


// QR elements
const digitalIdQr =
  document.getElementById(
    "digitalIdQr"
  );

const digitalIdQrMessage =
  document.getElementById(
    "digitalIdQrMessage"
  );

const verificationLink =
  document.getElementById(
    "verificationLink"
  );


let currentDashboardData = null;


// ==========================================================
// GLOBAL MESSAGE
// ==========================================================

function showStudentDashboardMessage(
  message,
  type = ""
) {

  if (!dashboardMessage) {
    return;
  }

  dashboardMessage.textContent =
    message;

  dashboardMessage.className =
    `status ${type}`;

}


// ==========================================================
// WALLET / HASH DISPLAY
// ==========================================================

function shortenWallet(
  walletAddress
) {

  if (
    !walletAddress ||
    walletAddress.length < 12
  ) {

    return walletAddress || "-";

  }


  return (
    `${walletAddress.slice(0, 8)}`
    + "..."
    + `${walletAddress.slice(-6)}`
  );

}


// ==========================================================
// STATUS FORMATTING
// ==========================================================

function formatStatus(
  status
) {

  if (!status) {
    return "Not Available";
  }


  return String(status)

    .replaceAll("_", " ")

    .replace(
      /\b\w/g,
      (character) =>
        character.toUpperCase()
    );

}


// ==========================================================
// REVOCATION TIME FORMATTING
// ==========================================================

function formatRevocationTime(
  time
) {

  if (!time) {

    return "No active revocation";

  }


  /*
    Support both:

    {
      months: 0,
      days: 0,
      hours: 0,
      minutes: 5
    }

    AND

    remaining_seconds: 300
  */

  if (
    typeof time === "number"
  ) {

    let remainingSeconds =
      Math.max(
        0,
        Number(time)
      );


    if (remainingSeconds <= 0) {

      return "No active revocation";

    }


    const days =
      Math.floor(
        remainingSeconds / 86400
      );


    remainingSeconds %= 86400;


    const hours =
      Math.floor(
        remainingSeconds / 3600
      );


    remainingSeconds %= 3600;


    const minutes =
      Math.floor(
        remainingSeconds / 60
      );


    const seconds =
      remainingSeconds % 60;


    const parts = [];


    if (days > 0) {

      parts.push(
        `${days} day${days === 1 ? "" : "s"}`
      );

    }


    if (hours > 0) {

      parts.push(
        `${hours} hour${hours === 1 ? "" : "s"}`
      );

    }


    if (minutes > 0) {

      parts.push(
        `${minutes} minute${minutes === 1 ? "" : "s"}`
      );

    }


    if (
      days === 0 &&
      hours === 0 &&
      minutes === 0 &&
      seconds > 0
    ) {

      parts.push(
        `${seconds} second${seconds === 1 ? "" : "s"}`
      );

    }


    return parts.join(", ");

  }


  const months =
    Number(
      time.months || 0
    );

  const days =
    Number(
      time.days || 0
    );

  const hours =
    Number(
      time.hours || 0
    );

  const minutes =
    Number(
      time.minutes || 0
    );

  const seconds =
    Number(
      time.seconds || 0
    );


  const parts = [];


  if (months > 0) {

    parts.push(
      `${months} month${months === 1 ? "" : "s"}`
    );

  }


  if (days > 0) {

    parts.push(
      `${days} day${days === 1 ? "" : "s"}`
    );

  }


  if (hours > 0) {

    parts.push(
      `${hours} hour${hours === 1 ? "" : "s"}`
    );

  }


  if (minutes > 0) {

    parts.push(
      `${minutes} minute${minutes === 1 ? "" : "s"}`
    );

  }


  if (
    months === 0 &&
    days === 0 &&
    hours === 0 &&
    minutes === 0 &&
    seconds > 0
  ) {

    parts.push(
      `${seconds} second${seconds === 1 ? "" : "s"}`
    );

  }


  return (
    parts.length > 0
      ? parts.join(", ")
      : "No active revocation"
  );

}


// ==========================================================
// LOGOUT
// ==========================================================

function logoutStudent() {

  window.PeraSoulUtils.clearStudentSession();

  sessionStorage.removeItem(
    "studentAccountStatus"
  );


  window.location.href =
    "student-login.html";

}


// ==========================================================
// PROTECT STUDENT DASHBOARD
// ==========================================================

function protectStudentDashboard() {

  if (
    !studentWalletAddress ||
    studentRole !== "student"
  ) {

    window.location.href =
      "student-login.html";

    return false;

  }


  return true;

}


// ==========================================================
// ACCOUNT BADGE
// ==========================================================

function updateAccountBadge(
  status
) {

  if (!accountStatusBadge) {
    return;
  }


  accountStatusBadge.textContent =
    formatStatus(status);


  if (status === "active") {

    accountStatusBadge.className =
      "badge badge-success";

  }

  else if (
    status === "pending"
  ) {

    accountStatusBadge.className =
      "badge badge-warning";

  }

  else {

    accountStatusBadge.className =
      "badge badge-danger";

  }

}


// ==========================================================
// PROFILE BADGE
// ==========================================================

function updateProfileBadge(
  status
) {

  if (!profileStatusBadge) {
    return;
  }


  profileStatusBadge.textContent =
    formatStatus(status);


  if (status === "active") {

    profileStatusBadge.className =
      "badge badge-success";

  }

  else if (
    status === "pending"
  ) {

    profileStatusBadge.className =
      "badge badge-warning";

  }

  else {

    profileStatusBadge.className =
      "badge badge-danger";

  }

}


// ==========================================================
// DIGITAL ID STATUS
// ==========================================================

function updateDigitalIdStatus(
  data
) {

  if (!digitalIdStatusBadge) {
    return;
  }


  const tokenStatus =
    data.token_status;


  if (!tokenStatus) {

    digitalIdStatusBadge.textContent =
      "Not Issued";

    digitalIdStatusBadge.className =
      "badge badge-warning";

    return;

  }


  if (
    tokenStatus === "active" &&
    data.is_valid_on_chain
  ) {

    digitalIdStatusBadge.textContent =
      "Valid";

    digitalIdStatusBadge.className =
      "badge badge-success";

    return;

  }


  if (
    tokenStatus ===
      "temporarily_revoked"
    ||
    tokenStatus ===
      "temporary_revoked"
  ) {

    digitalIdStatusBadge.textContent =
      "Temporarily Revoked";

    digitalIdStatusBadge.className =
      "badge badge-warning";

    return;

  }


  if (
    tokenStatus ===
      "permanently_revoked"
    ||
    tokenStatus === "revoked"
  ) {

    digitalIdStatusBadge.textContent =
      "Permanently Revoked";

    digitalIdStatusBadge.className =
      "badge badge-danger";

    return;

  }


  if (
    tokenStatus === "active" &&
    !data.is_valid_on_chain
  ) {

    digitalIdStatusBadge.textContent =
      "Not Valid";

    digitalIdStatusBadge.className =
      "badge badge-danger";

    return;

  }


  digitalIdStatusBadge.textContent =
    formatStatus(tokenStatus);

  digitalIdStatusBadge.className =
    "badge badge-blue";

}


// ==========================================================
// TOKEN REQUEST CONTROLS
// ==========================================================

function updateTokenRequestControls(
  data
) {

  if (!requestTokenButton) {
    return;
  }


  const requestStatus =
    data.token_request_status;

  const accountStatus =
    data.account_status;

  const tokenStatus =
    data.token_status;


  const statusElement =
    document.getElementById(
      "tokenRequestStatus"
    );


  requestTokenButton.disabled =
    false;


  // --------------------------------------------------------
  // Student not approved
  // --------------------------------------------------------

  if (
    accountStatus !== "active"
  ) {

    requestTokenButton.disabled =
      true;


    statusElement.textContent =
      `Your account is ${formatStatus(accountStatus)}. `
      + "University approval is required before requesting a token.";


    return;

  }


  // --------------------------------------------------------
  // Active token already exists
  // --------------------------------------------------------

  if (
    tokenStatus === "active"
  ) {

    requestTokenButton.disabled =
      true;


    statusElement.textContent =
      "Your Digital Student ID has already been issued.";


    return;

  }


  // --------------------------------------------------------
  // Temporarily revoked token still exists
  // --------------------------------------------------------

  if (
    tokenStatus ===
      "temporarily_revoked"
    ||
    tokenStatus ===
      "temporary_revoked"
  ) {

    requestTokenButton.disabled =
      true;


    statusElement.textContent =
      "Your Digital Student ID is temporarily revoked. "
      + "A new token cannot be requested.";


    return;

  }


  // --------------------------------------------------------
  // Permanently revoked
  // --------------------------------------------------------

  if (
    tokenStatus ===
      "permanently_revoked"
    ||
    tokenStatus === "revoked"
  ) {

    requestTokenButton.disabled =
      true;


    statusElement.textContent =
      "Your Digital Student ID has been permanently revoked. "
      + "Contact the university administrator for further assistance.";


    return;

  }


  // --------------------------------------------------------
  // Pending request
  // --------------------------------------------------------

  if (
    requestStatus === "pending"
  ) {

    requestTokenButton.disabled =
      true;


    statusElement.textContent =
      "Your token request is pending university administrator approval.";


    return;

  }


  // --------------------------------------------------------
  // Minted request
  // --------------------------------------------------------

  if (
    requestStatus === "minted"
  ) {

    requestTokenButton.disabled =
      true;


    statusElement.textContent =
      "Your token request has been approved and minted.";


    return;

  }


  // --------------------------------------------------------
  // Can request
  // --------------------------------------------------------

  statusElement.textContent =
    "Your account is active. You can request your Digital Student ID.";

}


// ==========================================================
// QR CODE
// ==========================================================

function updateDigitalIdQr(
  data
) {

  if (
    !digitalIdQr ||
    !verificationLink ||
    !digitalIdQrMessage
  ) {
    return;
  }


  /*
    Support either backend field:

    token_id
    student_token_id
  */

  const tokenId =
    data.token_id ??
    data.student_token_id ??
    null;


  if (!tokenId) {

    digitalIdQr.hidden =
      true;

    verificationLink.hidden =
      true;

    digitalIdQrMessage.hidden =
      false;

    digitalIdQrMessage.textContent =
      "QR code will appear after your Digital Student ID is issued.";


    return;

  }


  digitalIdQr.src =
    `${API_BASE_URL}/public/qr/${tokenId}`;


  digitalIdQr.hidden =
    false;


  digitalIdQrMessage.hidden =
    true;


  verificationLink.href =
    `../verify.html?token_id=${tokenId}`;


  verificationLink.hidden =
    false;

}


// ==========================================================
// DIGITAL STUDENT ID DETAILS
// ==========================================================

function updateDigitalStudentId(
  data
) {

  const tokenId =
    data.token_id ??
    data.student_token_id ??
    "-";


  document.getElementById(
    "digitalIdName"
  ).textContent =
    data.full_name || "-";


  document.getElementById(
    "digitalIdStudentNumber"
  ).textContent =
    data.student_number || "-";


  document.getElementById(
    "digitalIdDepartment"
  ).textContent =
    data.department || "-";


  document.getElementById(
    "digitalIdTokenId"
  ).textContent =
    tokenId;


  document.getElementById(
    "digitalIdNetwork"
  ).textContent =
    data.network ||
    "Ethereum Sepolia";


  const walletElement =
    document.getElementById(
      "digitalIdWallet"
    );


  walletElement.textContent =
    shortenWallet(
      data.wallet_address
    );


  walletElement.title =
    data.wallet_address || "";


  const validityElement =
    document.getElementById(
      "digitalIdValidity"
    );


  if (
    data.is_valid_on_chain
  ) {

    validityElement.textContent =
      "Valid";

    validityElement.className =
      "text-success";

  }

  else {

    validityElement.textContent =
      "Not Valid";

    validityElement.className =
      "text-danger";

  }


  updateDigitalIdStatus(data);

  updateDigitalIdQr(data);

}


// ==========================================================
// WALLET INFORMATION
// ==========================================================

function updateWalletInformation(
  data
) {

  const wallet =
    data.wallet_address ||
    studentWalletAddress;


  // Header wallet
  if (loggedStudentWallet) {

    loggedStudentWallet.textContent =
      shortenWallet(wallet);

    loggedStudentWallet.title =
      wallet || "";

  }


  // Wallet management card
  const currentWalletDisplay =
    document.getElementById(
      "currentWalletDisplay"
    );


  if (currentWalletDisplay) {

    currentWalletDisplay.textContent =
      shortenWallet(wallet);

    currentWalletDisplay.title =
      wallet || "";

  }


  const walletStatus =
    document.getElementById(
      "walletStatus"
    );


  if (walletStatus) {

    walletStatus.textContent =
      wallet
        ? "Registered"
        : "Not Registered";

  }

}


// ==========================================================
// IDENTITY STATUS INFORMATION
// ==========================================================

function updateIdentityStatus(
  data
) {

  const identityValidity =
    document.getElementById(
      "identityValidity"
    );


  const identityTokenStatus =
    document.getElementById(
      "identityTokenStatus"
    );


  // --------------------------------------------------------
  // Blockchain validity
  // --------------------------------------------------------

  if (
    data.is_valid_on_chain
  ) {

    identityValidity.textContent =
      "Valid Digital Student Identity";

    identityValidity.className =
      "text-success";

  }

  else {

    identityValidity.textContent =
      "Identity Not Currently Valid";

    identityValidity.className =
      "text-danger";

  }


  // --------------------------------------------------------
  // Token status
  // --------------------------------------------------------

  if (identityTokenStatus) {

    identityTokenStatus.textContent =
      formatStatus(
        data.token_status
      );

  }


  // --------------------------------------------------------
  // Revocation time
  // --------------------------------------------------------

  document.getElementById(
    "remainingRevocationTime"
  ).textContent =
    formatRevocationTime(
      data.remaining_revocation_time
      ??
      data.remaining_seconds
    );


  // --------------------------------------------------------
  // Latest transaction
  // --------------------------------------------------------

  const transactionElement =
    document.getElementById(
      "latestTransaction"
    );


  if (
    data.latest_tx_hash
  ) {

    transactionElement.textContent =
      shortenWallet(
        data.latest_tx_hash
      );

    transactionElement.title =
      data.latest_tx_hash;

  }

  else {

    transactionElement.textContent =
      "No blockchain transaction";

    transactionElement.title =
      "";

  }

}


// ==========================================================
// RENDER COMPLETE STUDENT DASHBOARD
// ==========================================================

function renderStudentDashboard(
  data
) {

  currentDashboardData =
    data;


  const fullName =
    data.full_name ||
    "Student";


  // --------------------------------------------------------
  // Header
  // --------------------------------------------------------

  document.getElementById(
    "studentWelcome"
  ).textContent =
    `Welcome, ${fullName}`;


  if (loggedStudentName) {

    loggedStudentName.textContent =
      fullName;

  }


  document.getElementById(
    "studentDashboardDescription"
  ).textContent =
    "Your student information and blockchain Digital Student Identity status are shown below.";


  // --------------------------------------------------------
  // Badges
  // --------------------------------------------------------

  updateAccountBadge(
    data.account_status
  );


  updateProfileBadge(
    data.account_status
  );


  // --------------------------------------------------------
  // Dashboard metrics
  // --------------------------------------------------------

  document.getElementById(
    "accountStatusMetric"
  ).textContent =
    formatStatus(
      data.account_status
    );


  document.getElementById(
    "tokenRequestMetric"
  ).textContent =
    formatStatus(
      data.token_request_status
    );


  document.getElementById(
    "tokenStatusMetric"
  ).textContent =
    formatStatus(
      data.token_status
    );


  document.getElementById(
    "blockchainValidityMetric"
  ).textContent =
    data.is_valid_on_chain
      ? "Valid"
      : "Not Valid";


  // --------------------------------------------------------
  // Student profile
  // --------------------------------------------------------

  document.getElementById(
    "profileFullName"
  ).textContent =
    data.full_name || "-";


  document.getElementById(
    "profileStudentNumber"
  ).textContent =
    data.student_number || "-";


  document.getElementById(
    "profileFaculty"
  ).textContent =
    data.faculty || "-";


  document.getElementById(
    "profileDepartment"
  ).textContent =
    data.department || "-";


  document.getElementById(
    "profileBatch"
  ).textContent =
    data.batch || "-";


  document.getElementById(
    "profileAcademicYear"
  ).textContent =
    data.academic_year || "-";


  const profileWallet =
    document.getElementById(
      "profileWallet"
    );


  profileWallet.textContent =
    shortenWallet(
      data.wallet_address
    );


  profileWallet.title =
    data.wallet_address || "";


  // --------------------------------------------------------
  // Other dashboard sections
  // --------------------------------------------------------

  updateWalletInformation(
    data
  );


  updateIdentityStatus(
    data
  );


  updateDigitalStudentId(
    data
  );


  updateTokenRequestControls(
    data
  );

}


// ==========================================================
// LOAD STUDENT DASHBOARD
// ==========================================================

async function loadStudentDashboard() {

  showStudentDashboardMessage(
    "Loading student dashboard..."
  );


  try {

    const response =
      await fetch(
        `${API_BASE_URL}/student/dashboard/${studentWalletAddress}`
      );


    const data =
      await response.json();


    if (!response.ok) {

      throw new Error(
        data.detail ||
        "Unable to load student dashboard."
      );

    }


    renderStudentDashboard(
      data
    );


    showStudentDashboardMessage(
      "Student dashboard loaded successfully.",
      "success"
    );


  } catch (error) {

    console.error(
      "Student dashboard error:",
      error
    );


    showStudentDashboardMessage(
      error.message ||
      "Failed to load student dashboard.",
      "error"
    );

  }

}


// ==========================================================
// REQUEST DIGITAL STUDENT ID
// ==========================================================

async function requestStudentToken() {

  if (!currentDashboardData) {

    showStudentDashboardMessage(
      "Dashboard information is not available.",
      "error"
    );

    return;

  }


  if (
    currentDashboardData.account_status
    !== "active"
  ) {

    showStudentDashboardMessage(
      "Only approved and active students can request a token.",
      "error"
    );

    return;

  }


  // Prevent another request when identity already exists.
  if (
    currentDashboardData.token_status
  ) {

    showStudentDashboardMessage(
      "A Digital Student ID already exists for this student.",
      "error"
    );

    return;

  }


  if (
    currentDashboardData
      .token_request_status
    === "pending"
  ) {

    showStudentDashboardMessage(
      "You already have a pending Digital Student ID request.",
      "error"
    );

    return;

  }


  const requestNote =
    document
      .getElementById(
        "tokenRequestNote"
      )
      .value
      .trim();


  requestTokenButton.disabled =
    true;


  requestTokenButton.textContent =
    "Submitting Request...";


  try {

    const response =
      await fetch(
        `${API_BASE_URL}/student/request-token`,
        {

          method: "POST",


          headers: {

            "Content-Type":
              "application/json"

          },


          body:
            JSON.stringify({

              wallet_address:
                studentWalletAddress,

              request_note:
                requestNote ||
                "Requesting Digital Student ID token"

            })

        }
      );


    const data =
      await response.json();


    if (!response.ok) {

      throw new Error(
        data.detail ||
        "Token request failed."
      );

    }


    showStudentDashboardMessage(
      "Digital Student ID request submitted successfully.",
      "success"
    );


    document.getElementById(
      "tokenRequestNote"
    ).value = "";


    await loadStudentDashboard();


  } catch (error) {

    console.error(
      "Token request error:",
      error
    );


    showStudentDashboardMessage(
      error.message ||
      "Unable to submit token request.",
      "error"
    );


  } finally {

    requestTokenButton.textContent =
      "Request Digital Student ID";


    /*
      renderStudentDashboard() will normally
      determine whether the button should
      remain disabled after the refresh.
    */

    if (
      currentDashboardData
      &&
      currentDashboardData
        .account_status === "active"
      &&
      !currentDashboardData
        .token_status
      &&
      currentDashboardData
        .token_request_status !==
        "pending"
      &&
      currentDashboardData
        .token_request_status !==
        "minted"
    ) {

      requestTokenButton.disabled =
        false;

    }

  }

}


// ==========================================================
// EVENT LISTENERS
// ==========================================================

const topStudentLogoutButton =
  document.getElementById(
    "topStudentLogoutButton"
  );


if (topStudentLogoutButton) {

  topStudentLogoutButton.addEventListener(
    "click",
    logoutStudent
  );

}


const sidebarStudentLogoutButton =
  document.getElementById(
    "sidebarStudentLogoutButton"
  );


if (sidebarStudentLogoutButton) {

  sidebarStudentLogoutButton.addEventListener(
    "click",
    logoutStudent
  );

}


if (requestTokenButton) {

  requestTokenButton.addEventListener(
    "click",
    requestStudentToken
  );

}


// ==========================================================
// START STUDENT DASHBOARD
// ==========================================================

if (
  protectStudentDashboard()
) {

  loadStudentDashboard();

}
