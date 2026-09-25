const API_BASE_URL =
  window.PeraSoulUtils.apiBaseUrl();


// ==========================================================
// PAGE ELEMENTS
// ==========================================================

const form =
  document.getElementById(
    "publicVerificationForm"
  );

const tokenInput =
  document.getElementById(
    "verificationTokenId"
  );

const verifyButton =
  document.getElementById(
    "verifyIdentityButton"
  );

const messageEl =
  document.getElementById(
    "verificationMessage"
  );

const resultEl =
  document.getElementById(
    "verificationResult"
  );


// ==========================================================
// FORMAT REVOCATION TIME
// ==========================================================

function formatSeconds(
  value
) {

  let seconds =
    Math.max(
      0,
      Number(value || 0)
    );


  const days =
    Math.floor(
      seconds / 86400
    );

  seconds %= 86400;


  const hours =
    Math.floor(
      seconds / 3600
    );

  seconds %= 3600;


  const minutes =
    Math.floor(
      seconds / 60
    );


  const secs =
    Math.floor(
      seconds % 60
    );


  const parts = [];


  if (days) {
    parts.push(
      `${days}d`
    );
  }


  if (hours) {
    parts.push(
      `${hours}h`
    );
  }


  if (minutes) {
    parts.push(
      `${minutes}m`
    );
  }


  if (
    !days
    && !hours
    && !minutes
  ) {

    parts.push(
      `${secs}s`
    );
  }


  return parts.join(" ");
}


// ==========================================================
// MESSAGE
// ==========================================================

function setMessage(
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
// RESET RESULT
// ==========================================================

function resetResult() {

  if (resultEl) {
    resultEl.hidden =
      true;
  }


  const remainingContainer =
    document.getElementById(
      "remainingTimeContainer"
    );


  if (remainingContainer) {
    remainingContainer.hidden =
      true;
  }
}


// ==========================================================
// SET VERIFY BUTTON STATE
// ==========================================================

function setVerifyLoading(
  loading
) {

  if (!verifyButton) {
    return;
  }


  verifyButton.disabled =
    loading;


  verifyButton.textContent =
    loading
      ? "Verifying..."
      : "Verify Identity";
}


// ==========================================================
// RESULT STATUS CLASS
// ==========================================================

function verificationStatusClass(
  status,
  verified
) {

  const normalized =
    String(
      status || ""
    )
      .toUpperCase();


  if (verified) {
    return "text-success";
  }


  if (
    normalized ===
      "TEMPORARILY_REVOKED"
  ) {

    return "text-warning";
  }


  return "text-danger";
}


// ==========================================================
// RENDER VERIFICATION RESULT
// ==========================================================

function renderVerification(
  data,
  verificationMode = "token"
) {

  const status =
    String(
      data.status || "INVALID"
    );


  // --------------------------------------------------------
  // STATUS
  // --------------------------------------------------------

  const statusElement =
    document.getElementById(
      "verificationStatus"
    );


  if (statusElement) {

    statusElement.textContent =
      window.PeraSoulUtils
        .formatStatus(
          status
        );


    statusElement.className =
      verificationStatusClass(
        status,
        data.verified
      );
  }


  // --------------------------------------------------------
  // STUDENT NAME
  // --------------------------------------------------------

  const nameElement =
    document.getElementById(
      "verifiedName"
    );


  if (nameElement) {

    nameElement.textContent =
      data.full_name
      || "-";
  }


  // --------------------------------------------------------
  // STUDENT NUMBER
  // --------------------------------------------------------

  const studentNumberElement =
    document.getElementById(
      "verifiedStudentNumber"
    );


  if (studentNumberElement) {

    studentNumberElement.textContent =
      data.student_number
      || "-";
  }


  // --------------------------------------------------------
  // DEPARTMENT
  // --------------------------------------------------------

  const departmentElement =
    document.getElementById(
      "verifiedDepartment"
    );


  if (departmentElement) {

    departmentElement.textContent =
      data.department
      || "-";
  }


  // --------------------------------------------------------
  // TOKEN ID
  // --------------------------------------------------------

  const tokenIdElement =
    document.getElementById(
      "verifiedTokenId"
    );


  if (tokenIdElement) {

    tokenIdElement.textContent =
      data.token_id
      ?? "-";
  }


  // --------------------------------------------------------
  // WALLET
  // --------------------------------------------------------

  const walletElement =
    document.getElementById(
      "verifiedWallet"
    );


  if (walletElement) {

    walletElement.textContent =
      window.PeraSoulUtils
        .shortenValue(
          data.wallet_address
        );


    walletElement.title =
      data.wallet_address
      || "";
  }


  // --------------------------------------------------------
  // TEMPORARY REVOCATION
  // --------------------------------------------------------

  const temporarilyRevoked =
    String(
      data.status || ""
    ).toUpperCase()
      === "TEMPORARILY_REVOKED"
    ||
    Number(
      data.remaining_seconds
      || 0
    ) > 0;


  const remainingContainer =
    document.getElementById(
      "remainingTimeContainer"
    );


  if (remainingContainer) {

    remainingContainer.hidden =
      !temporarilyRevoked;
  }


  if (temporarilyRevoked) {

    const remainingElement =
      document.getElementById(
        "remainingTime"
      );


    if (remainingElement) {

      remainingElement.textContent =
        formatSeconds(
          data.remaining_seconds
        );
    }
  }


  // --------------------------------------------------------
  // SHOW RESULT
  // --------------------------------------------------------

  if (resultEl) {
    resultEl.hidden =
      false;
  }


  // --------------------------------------------------------
  // MAIN VERIFICATION MESSAGE
  // --------------------------------------------------------

  if (data.verified) {

    if (
      verificationMode === "qr"
    ) {

      setMessage(
        "Live QR verified successfully. This Digital Student ID is currently valid.",
        "success"
      );

    } else {

      setMessage(
        "Digital identity is currently valid.",
        "success"
      );
    }


    return;
  }


  const normalizedStatus =
    String(
      data.status || ""
    ).toUpperCase();


  if (
    normalizedStatus ===
      "TEMPORARILY_REVOKED"
  ) {

    setMessage(
      "This Digital Student ID is temporarily revoked and is not currently valid.",
      "error"
    );

    return;
  }


  if (
    normalizedStatus ===
      "PERMANENTLY_REVOKED"
  ) {

    setMessage(
      "This Digital Student ID has been permanently revoked.",
      "error"
    );

    return;
  }


  if (
    normalizedStatus ===
      "REPLACED"
  ) {

    setMessage(
      "This Digital Student ID was replaced and is no longer valid.",
      "error"
    );

    return;
  }


  setMessage(
    "Digital identity is not currently valid.",
    "error"
  );
}


// ==========================================================
// NORMAL TOKEN-ID VERIFICATION
// ==========================================================

async function verifyTokenId(
  tokenId
) {

  const cleanTokenId =
    String(
      tokenId || ""
    ).trim();


  if (
    !cleanTokenId
    || !/^\d+$/.test(
      cleanTokenId
    )
  ) {

    resetResult();


    setMessage(
      "Enter a valid numeric token ID.",
      "error"
    );


    return;
  }


  setVerifyLoading(
    true
  );


  resetResult();


  setMessage(
    "Checking current identity status..."
  );


  try {

    const response =
      await fetch(
        `${API_BASE_URL}/public/verify/${encodeURIComponent(cleanTokenId)}`,
        {
          method:
            "GET",

          cache:
            "no-store"
        }
      );


    const data =
      await window.PeraSoulUtils
        .jsonResponse(
          response
        );


    renderVerification(
      data,
      "token"
    );


  } catch (error) {

    resetResult();


    setMessage(
      error.message
      || "Identity verification failed.",
      "error"
    );


  } finally {

    setVerifyLoading(
      false
    );
  }
}


// ==========================================================
// SIGNED QR VERIFICATION
// ==========================================================

async function verifyQrToken(
  qrToken
) {

  const cleanQrToken =
    String(
      qrToken || ""
    ).trim();


  if (!cleanQrToken) {

    resetResult();


    setMessage(
      "Invalid QR verification link.",
      "error"
    );


    return;
  }


  setVerifyLoading(
    true
  );


  resetResult();


  setMessage(
    "Checking secure QR and current blockchain identity status..."
  );


  try {

    const response =
      await fetch(
        `${API_BASE_URL}/public/verify-qr/${encodeURIComponent(cleanQrToken)}`,
        {
          method:
            "GET",

          cache:
            "no-store"
        }
      );


    let data = {};


    try {

      data =
        await response.json();

    } catch (_) {

      data = {};
    }


    // ------------------------------------------------------
    // EXPIRED QR
    // ------------------------------------------------------

    if (
      response.status === 410
    ) {

      resetResult();


      setMessage(
        data.detail
        || "This QR verification code has expired. Ask the student to display a new QR code.",
        "error"
      );


      return;
    }


    // ------------------------------------------------------
    // INVALID QR
    // ------------------------------------------------------

    if (!response.ok) {

      throw new Error(
        data.detail
        || `QR verification failed with status ${response.status}.`
      );
    }


    // ------------------------------------------------------
    // QR WAS SIGNED + NOT EXPIRED
    // ------------------------------------------------------

    if (
      data.qr_verified
      !== true
    ) {

      throw new Error(
        "QR verification could not be confirmed."
      );
    }


    // ------------------------------------------------------
    // Put token ID in the normal token field as evidence
    // ------------------------------------------------------

    if (
      tokenInput
      && data.token_id
    ) {

      tokenInput.value =
        data.token_id;
    }


    renderVerification(
      data,
      "qr"
    );


  } catch (error) {

    console.error(
      "QR verification failed:",
      error
    );


    resetResult();


    setMessage(
      error.message
      || "Unable to verify this QR code.",
      "error"
    );


  } finally {

    setVerifyLoading(
      false
    );
  }
}


// ==========================================================
// MANUAL TOKEN FORM
// ==========================================================

form?.addEventListener(
  "submit",
  (event) => {

    event.preventDefault();


    verifyTokenId(
      tokenInput?.value
    );
  }
);


// ==========================================================
// READ VERIFICATION URL
// ==========================================================

const params =
  new URLSearchParams(
    window.location.search
  );


const queryQrToken =
  params.get(
    "qr"
  );


const queryTokenId =
  params.get(
    "token_id"
  );


// ==========================================================
// INITIAL VERIFICATION FLOW
// ==========================================================

if (queryQrToken) {

  /*
    QR always takes priority.

    Example:
    verify.html?qr=eyJ...
  */

  verifyQrToken(
    queryQrToken
  );


} else if (queryTokenId) {

  /*
    Existing permanent Token-ID link remains supported.

    Example:
    verify.html?token_id=18
  */

  if (tokenInput) {

    tokenInput.value =
      queryTokenId;
  }


  verifyTokenId(
    queryTokenId
  );


} else {

  setMessage(
    "Enter a token ID or scan a live PeraSoul QR verification code."
  );
}