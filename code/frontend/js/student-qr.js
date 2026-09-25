const API_BASE_URL =
  window.PeraSoulUtils.apiBaseUrl();


const studentWallet =
  sessionStorage.getItem(
    "studentWalletAddress"
  );

const studentRole =
  sessionStorage.getItem(
    "studentRole"
  );


// ==========================================================
// PAGE ELEMENTS
// ==========================================================

const messageEl =
  document.getElementById(
    "qrPageMessage"
  );

const qrContainer =
  document.getElementById(
    "studentQrCode"
  );

const qrPlaceholder =
  document.getElementById(
    "qrPlaceholderText"
  );

const qrCountdownArea =
  document.getElementById(
    "qrCountdownArea"
  );

const qrCountdown =
  document.getElementById(
    "qrCountdown"
  );

const qrProgressFill =
  document.getElementById(
    "qrProgressFill"
  );

const qrLiveIndicator =
  document.getElementById(
    "qrLiveIndicator"
  );

const refreshQrButton =
  document.getElementById(
    "refreshQrButton"
  );

const openVerificationLink =
  document.getElementById(
    "openVerificationLink"
  );

const qrLinkPreview =
  document.getElementById(
    "qrLinkPreview"
  );

const qrVerificationUrl =
  document.getElementById(
    "qrVerificationUrl"
  );

const qrNetworkWarning =
  document.getElementById(
    "qrNetworkWarning"
  );


// ==========================================================
// QR STATE
// ==========================================================

let currentTokenId = null;

let currentQrToken = null;

let currentQrExpiresAt = null;

let countdownTimer = null;

let qrRefreshInProgress = false;


// ==========================================================
// PAGE MESSAGE
// ==========================================================

function showMessage(
  message,
  type = ""
) {

  if (!messageEl) {
    return;
  }

  messageEl.textContent =
    message;

  messageEl.className =
    `status ${type}`;
}


// ==========================================================
// LOGOUT
// ==========================================================

function logoutStudent() {

  stopCountdown();

  window.PeraSoulUtils
    .clearStudentSession();

  window.location.href =
    "student-login.html";
}


// ==========================================================
// PAGE PROTECTION
// ==========================================================

function protectPage() {

  if (
    !studentWallet
    || studentRole !== "student"
  ) {

    logoutStudent();

    return false;
  }

  return true;
}


// ==========================================================
// PUBLIC FRONTEND BASE URL
// ==========================================================

function getPublicFrontendBaseUrl() {

  /*
    Optional override.

    Example:

    window.PERASOUL_PUBLIC_BASE_URL =
      "http://192.168.1.25:5500";

    If no override is supplied, the URL currently being
    used in the browser is used automatically.
  */

  if (
    typeof window.PERASOUL_PUBLIC_BASE_URL
      === "string"
    &&
    window.PERASOUL_PUBLIC_BASE_URL.trim()
  ) {

    return (
      window.PERASOUL_PUBLIC_BASE_URL
        .trim()
        .replace(/\/+$/, "")
    );
  }


  return window.location.origin;
}


// ==========================================================
// BUILD QR VERIFICATION URL
// ==========================================================

function buildVerificationUrl(
  qrToken
) {

  const baseUrl =
    getPublicFrontendBaseUrl();


  const verificationUrl =
    new URL(
      `${baseUrl}/verify.html`
    );


  verificationUrl.searchParams.set(
    "qr",
    qrToken
  );


  return verificationUrl.toString();
}


// ==========================================================
// LOCALHOST / PHONE WARNING
// ==========================================================

function updateNetworkWarning() {

  if (!qrNetworkWarning) {
    return;
  }


  const hostname =
    window.location.hostname
      .toLowerCase();


  const localOnlyHost =
    hostname === "127.0.0.1"
    || hostname === "localhost"
    || hostname === "::1";


  if (localOnlyHost) {

    qrNetworkWarning.hidden =
      false;

    qrNetworkWarning.className =
      "status error";

    qrNetworkWarning.innerHTML =
      `
        This page is currently running through
        <strong>${window.PeraSoulUtils.escapeHtml(hostname)}</strong>.
        A phone cannot reach that address on your computer.
        For phone scanning, open PeraSoul using your computer's
        local network IP address, for example
        <strong>http://192.168.x.x:5500</strong>.
      `;

  } else {

    qrNetworkWarning.hidden =
      false;

    qrNetworkWarning.className =
      "status success";

    qrNetworkWarning.textContent =
      `QR links are being generated for ${window.location.host}. Another device on the same reachable network can open them.`;
  }
}


// ==========================================================
// IDENTITY STATUS BADGE
// ==========================================================

function updateValidityBadge(
  data
) {

  const badge =
    document.getElementById(
      "qrValidityBadge"
    );


  if (!badge) {
    return;
  }


  const status =
    String(
      data.token_status || ""
    )
      .toLowerCase();


  if (data.is_valid_on_chain) {

    badge.textContent =
      "Valid";

    badge.className =
      "badge badge-success";

    return;
  }


  if (
    status.includes("tempor")
  ) {

    badge.textContent =
      "Temporarily Revoked";

    badge.className =
      "badge badge-warning";

    return;
  }


  if (
    status.includes("revoked")
    || status.includes("replaced")
  ) {

    badge.textContent =
      "Not Valid";

    badge.className =
      "badge badge-danger";

    return;
  }


  badge.textContent =
    "Not Valid";

  badge.className =
    "badge badge-warning";
}


// ==========================================================
// CLEAR QR DISPLAY
// ==========================================================

function clearQrDisplay() {

  if (qrContainer) {
    qrContainer.innerHTML = "";
  }


  if (qrPlaceholder) {
    qrPlaceholder.hidden = false;
  }


  if (qrCountdownArea) {
    qrCountdownArea.hidden = true;
  }


  if (qrLiveIndicator) {
    qrLiveIndicator.hidden = true;
  }


  if (openVerificationLink) {
    openVerificationLink.hidden = true;
  }


  if (qrLinkPreview) {
    qrLinkPreview.hidden = true;
  }
}


// ==========================================================
// STOP COUNTDOWN
// ==========================================================

function stopCountdown() {

  if (countdownTimer) {

    clearInterval(
      countdownTimer
    );

    countdownTimer = null;
  }
}


// ==========================================================
// RENDER QR CODE
// ==========================================================

function renderQrCode(
  verificationUrl
) {

  if (!qrContainer) {

    throw new Error(
      "QR container was not found."
    );
  }


  if (
    typeof QRCode === "undefined"
  ) {

    throw new Error(
      "QR code library failed to load."
    );
  }


  qrContainer.innerHTML = "";


  new QRCode(
    qrContainer,
    {
      text:
        verificationUrl,

      width:
        230,

      height:
        230,

      correctLevel:
        QRCode.CorrectLevel.M
    }
  );


  if (qrPlaceholder) {
    qrPlaceholder.hidden = true;
  }


  /*
    QRCode.js can generate either an image or canvas.
    Give the generated image a useful accessible label.
  */

  setTimeout(
    () => {

      const generatedImage =
        qrContainer.querySelector(
          "img"
        );


      if (generatedImage) {

        generatedImage.alt =
          "PeraSoul 10-second live verification QR code";
      }

    },
    50
  );
}


// ==========================================================
// COUNTDOWN DISPLAY
// ==========================================================

function updateCountdownDisplay() {

  if (!currentQrExpiresAt) {
    return;
  }


  const nowSeconds =
    Date.now() / 1000;


  const remainingMilliseconds =
    Math.max(
      0,
      (
        currentQrExpiresAt
        - nowSeconds
      ) * 1000
    );


  /*
    ceil() keeps the initial display at 10 rather than
    immediately showing 9 due to request/render latency.
  */

  const remainingSeconds =
    Math.max(
      0,
      Math.ceil(
        remainingMilliseconds
        / 1000
      )
    );


  if (qrCountdown) {

    qrCountdown.textContent =
      String(
        remainingSeconds
      );
  }


  if (qrProgressFill) {

    const percentage =
      Math.max(
        0,
        Math.min(
          100,
          (
            remainingMilliseconds
            / 10000
          ) * 100
        )
      );


    qrProgressFill.style.width =
      `${percentage}%`;
  }


  // --------------------------------------------------------
  // QR expired
  // --------------------------------------------------------

  if (
    remainingMilliseconds <= 0
  ) {

    stopCountdown();


    if (qrCountdown) {
      qrCountdown.textContent =
        "0";
    }


    if (qrProgressFill) {
      qrProgressFill.style.width =
        "0%";
    }


    showMessage(
      "The previous QR expired. Generating a new secure verification QR..."
    );


    generateNewQr();
  }
}


// ==========================================================
// START COUNTDOWN
// ==========================================================

function startCountdown() {

  stopCountdown();


  if (qrCountdownArea) {
    qrCountdownArea.hidden =
      false;
  }


  if (qrLiveIndicator) {
    qrLiveIndicator.hidden =
      false;
  }


  updateCountdownDisplay();


  /*
    Use a short UI refresh interval, but calculate the
    remaining time from the backend expiry timestamp.
    The backend, not this timer, decides whether the QR
    is actually expired.
  */

  countdownTimer =
    setInterval(
      updateCountdownDisplay,
      250
    );
}


// ==========================================================
// REQUEST NEW SIGNED QR SESSION
// ==========================================================

async function requestQrSession(
  tokenId
) {

  const response =
    await fetch(
      `${API_BASE_URL}/public/qr-session/${encodeURIComponent(tokenId)}`,
      {
        method:
          "GET",

        cache:
          "no-store"
      }
    );


  return (
    window.PeraSoulUtils
      .jsonResponse(
        response
      )
  );
}


// ==========================================================
// GENERATE NEW QR
// ==========================================================

async function generateNewQr() {

  if (!currentTokenId) {
    return;
  }


  if (qrRefreshInProgress) {
    return;
  }


  qrRefreshInProgress =
    true;


  if (refreshQrButton) {

    refreshQrButton.disabled =
      true;

    refreshQrButton.textContent =
      "Generating...";
  }


  stopCountdown();


  try {

    showMessage(
      "Generating a new 10-second secure verification QR..."
    );


    const qrSession =
      await requestQrSession(
        currentTokenId
      );


    if (
      !qrSession.qr_token
      || !qrSession.expires_at
    ) {

      throw new Error(
        "Backend did not return a valid QR session."
      );
    }


    currentQrToken =
      qrSession.qr_token;


    currentQrExpiresAt =
      Number(
        qrSession.expires_at
      );


    const verificationUrl =
      buildVerificationUrl(
        currentQrToken
      );


    // ------------------------------------------------------
    // Render QR
    // ------------------------------------------------------

    renderQrCode(
      verificationUrl
    );


    // ------------------------------------------------------
    // Direct verification button
    // ------------------------------------------------------

    if (openVerificationLink) {

      openVerificationLink.href =
        verificationUrl;

      openVerificationLink.hidden =
        false;
    }


    // ------------------------------------------------------
    // Show encoded URL for testing/evidence
    // ------------------------------------------------------

    if (
      qrLinkPreview
      && qrVerificationUrl
    ) {

      qrVerificationUrl.textContent =
        verificationUrl;

      qrLinkPreview.hidden =
        false;
    }


    // ------------------------------------------------------
    // Start expiry countdown
    // ------------------------------------------------------

    startCountdown();


    showMessage(
      "Live verification QR generated. It will automatically refresh after 10 seconds.",
      "success"
    );


  } catch (error) {

    console.error(
      "QR generation failed:",
      error
    );


    currentQrToken =
      null;

    currentQrExpiresAt =
      null;


    clearQrDisplay();


    showMessage(
      error.message
      || "Unable to generate verification QR.",
      "error"
    );


  } finally {

    qrRefreshInProgress =
      false;


    if (refreshQrButton) {

      refreshQrButton.disabled =
        false;

      refreshQrButton.textContent =
        "Generate New QR";
    }
  }
}


// ==========================================================
// LOAD STUDENT IDENTITY
// ==========================================================

async function loadQrIdentity() {

  if (!protectPage()) {
    return;
  }


  try {

    showMessage(
      "Loading your Digital Student ID..."
    );


    const response =
      await fetch(
        `${API_BASE_URL}/student/dashboard/${encodeURIComponent(studentWallet)}`,
        {
          cache:
            "no-store"
        }
      );


    const data =
      await window.PeraSoulUtils
        .jsonResponse(
          response
        );


    // ------------------------------------------------------
    // HEADER
    // ------------------------------------------------------

    const nameEl =
      document.getElementById(
        "loggedStudentName"
      );


    if (nameEl) {

      nameEl.textContent =
        data.full_name
        || "Student";
    }


    const walletEl =
      document.getElementById(
        "loggedStudentWallet"
      );


    if (walletEl) {

      walletEl.textContent =
        window.PeraSoulUtils
          .shortenValue(
            data.wallet_address,
            6,
            4
          );


      walletEl.title =
        data.wallet_address
        || "";
    }


    // ------------------------------------------------------
    // IDENTITY SUMMARY
    // ------------------------------------------------------

    document.getElementById(
      "qrStudentNumber"
    ).textContent =
      data.student_number
      || "-";


    document.getElementById(
      "qrTokenId"
    ).textContent =
      data.token_id
      ?? "-";


    document.getElementById(
      "qrTokenStatus"
    ).textContent =
      window.PeraSoulUtils
        .formatStatus(
          data.token_status
        );


    document.getElementById(
      "qrValidity"
    ).textContent =
      data.is_valid_on_chain
        ? "Valid"
        : "Not Valid";


    updateValidityBadge(
      data
    );


    // ------------------------------------------------------
    // NO DIGITAL ID TOKEN
    // ------------------------------------------------------

    if (!data.token_id) {

      currentTokenId =
        null;


      clearQrDisplay();


      if (refreshQrButton) {
        refreshQrButton.disabled =
          true;
      }


      if (qrPlaceholder) {

        qrPlaceholder.textContent =
          "A verification QR will become available after your Digital Student ID token is issued.";

        qrPlaceholder.hidden =
          false;
      }


      showMessage(
        "A verification QR will become available after the Digital Student ID is issued."
      );


      return;
    }


    // ------------------------------------------------------
    // TOKEN EXISTS
    // ------------------------------------------------------

    currentTokenId =
      String(
        data.token_id
      );


    if (refreshQrButton) {
      refreshQrButton.disabled =
        false;
    }


    await generateNewQr();


  } catch (error) {

    console.error(
      "Unable to load QR identity:",
      error
    );


    clearQrDisplay();


    showMessage(
      error.message
      || "Unable to load QR verification data.",
      "error"
    );
  }
}


// ==========================================================
// MANUAL QR REFRESH
// ==========================================================

refreshQrButton
  ?.addEventListener(
    "click",
    () => {

      generateNewQr();
    }
  );


// ==========================================================
// LOGOUT BUTTONS
// ==========================================================

document
  .getElementById(
    "topStudentLogoutButton"
  )
  ?.addEventListener(
    "click",
    logoutStudent
  );


document
  .getElementById(
    "sidebarStudentLogoutButton"
  )
  ?.addEventListener(
    "click",
    logoutStudent
  );


// ==========================================================
// STOP TIMER WHEN PAGE CLOSES
// ==========================================================

window.addEventListener(
  "beforeunload",
  () => {

    stopCountdown();
  }
);


// ==========================================================
// INITIALIZE
// ==========================================================

updateNetworkWarning();

loadQrIdentity();
