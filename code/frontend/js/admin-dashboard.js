const API_BASE_URL =
  window.PeraSoulUtils.apiBaseUrl();

const adminToken =
  sessionStorage.getItem(
    "adminAccessToken"
  );


const dashboardMessage =
  document.getElementById(
    "dashboardMessage"
  );

const pendingStudentsTableBody =
  document.getElementById(
    "pendingStudentsTableBody"
  );

const tokenRequestsTableBody =
  document.getElementById(
    "tokenRequestsTableBody"
  );

const activeTokensTableBody =
  document.getElementById(
    "activeTokensTableBody"
  );


// ==========================================================
// AUTHORIZATION HEADERS
// ==========================================================

function authHeaders() {

  return {
    "Content-Type":
      "application/json",

    "Authorization":
      `Bearer ${adminToken}`
  };
}


// ==========================================================
// GLOBAL MESSAGE
// ==========================================================

function showMessage(
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
// LOGOUT
// ==========================================================

function logoutAdmin() {

  window.PeraSoulUtils
    .clearAdminSession();

  window.location.href =
    "admin-login.html";
}


// ==========================================================
// VERIFY UNIVERSITY ADMIN SESSION
// ==========================================================

async function verifyAdminSession() {

  if (!adminToken) {

    logoutAdmin();

    return false;
  }


  try {

    const response =
      await fetch(
        `${API_BASE_URL}/admin-auth/me`,
        {
          headers:
            authHeaders()
        }
      );


    const data =
      await window.PeraSoulUtils
        .jsonResponse(response);


    // ------------------------------------------------------
    // ROLE-BASED PAGE PROTECTION
    // ------------------------------------------------------

    if (
      data.role ===
      "technical_admin"
    ) {

      // A Technical Administrator has a valid
      // administrative session, but this is the
      // University Administrator workspace.

      sessionStorage.setItem(
        "adminRole",
        data.role
      );

      sessionStorage.setItem(
        "adminWallet",
        data.wallet_address || ""
      );

      sessionStorage.setItem(
        "adminDisplayName",
        data.display_name
        || "Technical Administrator"
      );


      window.location.href =
        "technical-admin-dashboard.html";

      return false;
    }


    if (
      data.role !==
      "university_admin"
    ) {

      throw new Error(
        "University Administrator access required."
      );
    }


    // ------------------------------------------------------
    // UPDATE LOCAL SESSION INFORMATION
    // ------------------------------------------------------

    sessionStorage.setItem(
      "adminRole",
      data.role
    );


    const displayName =
      data.display_name
      || sessionStorage.getItem(
        "adminDisplayName"
      )
      || "University Administrator";


    const wallet =
      data.wallet_address
      || sessionStorage.getItem(
        "adminWallet"
      )
      || "";


    sessionStorage.setItem(
      "adminDisplayName",
      displayName
    );


    if (wallet) {

      sessionStorage.setItem(
        "adminWallet",
        wallet
      );
    }


    // ------------------------------------------------------
    // DISPLAY ADMIN NAME
    // ------------------------------------------------------

    const nameEl =
      document.getElementById(
        "loggedAdminName"
      );


    if (nameEl) {

      nameEl.textContent =
        displayName;
    }


    // ------------------------------------------------------
    // DISPLAY SHORT WALLET
    // ------------------------------------------------------

    const walletEl =
      document.getElementById(
        "loggedAdminWallet"
      );


    if (walletEl) {

      walletEl.textContent =
        window.PeraSoulUtils
          .shortenValue(
            wallet,
            6,
            4
          );

      walletEl.title =
        wallet;
    }


    // ------------------------------------------------------
    // DISPLAY FULL WALLET
    // ------------------------------------------------------

    const fullWalletEl =
      document.getElementById(
        "adminWalletDisplay"
      );


    if (fullWalletEl) {

      fullWalletEl.textContent =
        wallet || "-";

      fullWalletEl.title =
        wallet;
    }


    return true;


  } catch (error) {

    console.error(
      "University Administrator session verification failed:",
      error
    );


    window.PeraSoulUtils
      .clearAdminSession();


    window.location.href =
      "admin-login.html";


    return false;
  }
}


// ==========================================================
// LOAD DASHBOARD STATISTICS
// ==========================================================

async function loadDashboardStatistics() {

  const response =
    await fetch(
      `${API_BASE_URL}/admin/dashboard`,
      {
        headers:
          authHeaders()
      }
    );


  const data =
    await window.PeraSoulUtils
      .jsonResponse(response);


  const values = {

    totalStudents:
      data.total_students,

    pendingStudents:
      data.pending_students,

    activeStudents:
      data.active_students,

    pendingTokenRequests:
      data.pending_token_requests,

    mintedTokens:
      data.minted_tokens,

    activeTokens:
      data.active_tokens,

    temporaryRevocations:
      data.temporary_revocations,

    totalTransactions:
      data.total_transactions
  };


  Object.entries(
    values
  ).forEach(
    ([id, value]) => {

      const el =
        document.getElementById(id);

      if (el) {

        el.textContent =
          value ?? 0;
      }
    }
  );
}


// ==========================================================
// LOAD PENDING STUDENTS
// ==========================================================

async function loadPendingStudents() {

  if (!pendingStudentsTableBody) {
    return;
  }


  pendingStudentsTableBody.innerHTML =
    '<tr><td colspan="7">Loading pending students...</td></tr>';


  try {

    const response =
      await fetch(
        `${API_BASE_URL}/admin/pending-students`,
        {
          headers:
            authHeaders()
        }
      );


    const students =
      await window.PeraSoulUtils
        .jsonResponse(response);


    if (
      !Array.isArray(students)
      || !students.length
    ) {

      pendingStudentsTableBody.innerHTML =
        '<tr><td colspan="7">No pending student registrations.</td></tr>';

      return;
    }


    pendingStudentsTableBody.innerHTML =
      students.map(
        (student) => `

          <tr>

            <td>
              ${
                window.PeraSoulUtils
                  .escapeHtml(
                    student.user_id
                  )
              }
            </td>

            <td>
              ${
                window.PeraSoulUtils
                  .escapeHtml(
                    student.student_number
                  )
              }
            </td>

            <td>
              ${
                window.PeraSoulUtils
                  .escapeHtml(
                    student.full_name
                  )
              }
            </td>

            <td>
              ${
                window.PeraSoulUtils
                  .escapeHtml(
                    student.department
                  )
              }
            </td>

            <td
              title="${
                window.PeraSoulUtils
                  .escapeHtml(
                    student.wallet_address
                  )
              }"
            >

              ${
                window.PeraSoulUtils
                  .escapeHtml(
                    window.PeraSoulUtils
                      .shortenValue(
                        student.wallet_address,
                        6,
                        4
                      )
                  )
              }

            </td>

            <td>

              <span class="badge badge-warning">

                ${
                  window.PeraSoulUtils
                    .escapeHtml(
                      student.status
                    )
                }

              </span>

            </td>

            <td>

              <button
                type="button"
                class="btn btn-primary"
                data-approve-student="${
                  Number(
                    student.user_id
                  )
                }"
              >
                Approve
              </button>

            </td>

          </tr>

        `
      ).join("");


    pendingStudentsTableBody
      .querySelectorAll(
        "[data-approve-student]"
      )
      .forEach(
        (button) => {

          button.addEventListener(
            "click",
            () => {

              approveStudent(
                Number(
                  button.dataset
                    .approveStudent
                )
              );
            }
          );
        }
      );


  } catch (error) {

    pendingStudentsTableBody.innerHTML =
      `<tr>
        <td colspan="7">
          ${
            window.PeraSoulUtils
              .escapeHtml(
                error.message
              )
          }
        </td>
      </tr>`;
  }
}


// ==========================================================
// APPROVE STUDENT
// ==========================================================

async function approveStudent(
  userId
) {

  if (
    !window.confirm(
      `Approve student account ${userId}?`
    )
  ) {

    return;
  }


  try {

    showMessage(
      "Approving student account..."
    );


    const response =
      await fetch(
        `${API_BASE_URL}/admin/approve-student/${userId}`,
        {
          method:
            "POST",

          headers:
            authHeaders()
        }
      );


    const data =
      await window.PeraSoulUtils
        .jsonResponse(response);


    showMessage(
      data.message
      || "Student approved successfully.",
      "success"
    );


    await Promise.all([
      loadDashboardStatistics(),
      loadPendingStudents()
    ]);


  } catch (error) {

    showMessage(
      error.message
      || "Student approval failed.",
      "error"
    );
  }
}


// ==========================================================
// LOAD TOKEN REQUESTS
// ==========================================================

async function loadTokenRequests() {

  if (!tokenRequestsTableBody) {
    return;
  }


  tokenRequestsTableBody.innerHTML =
    '<tr><td colspan="6">Loading token requests...</td></tr>';


  try {

    const response =
      await fetch(
        `${API_BASE_URL}/admin/token-requests`,
        {
          headers:
            authHeaders()
        }
      );


    const requests =
      await window.PeraSoulUtils
        .jsonResponse(response);


    if (
      !Array.isArray(requests)
      || !requests.length
    ) {

      tokenRequestsTableBody.innerHTML =
        '<tr><td colspan="6">No pending token requests.</td></tr>';

      return;
    }


    tokenRequestsTableBody.innerHTML =
      requests.map(
        (request) => `

          <tr>

            <td>
              ${
                window.PeraSoulUtils
                  .escapeHtml(
                    request.id
                  )
              }
            </td>

            <td>
              ${
                window.PeraSoulUtils
                  .escapeHtml(
                    request.student_user_id
                  )
              }
            </td>

            <td
              title="${
                window.PeraSoulUtils
                  .escapeHtml(
                    request.wallet_address
                  )
              }"
            >

              ${
                window.PeraSoulUtils
                  .escapeHtml(
                    window.PeraSoulUtils
                      .shortenValue(
                        request.wallet_address
                      )
                  )
              }

            </td>

            <td>

              ${
                window.PeraSoulUtils
                  .escapeHtml(
                    request.request_note
                    || "-"
                  )
              }

            </td>

            <td>

              <span class="badge badge-warning">

                ${
                  window.PeraSoulUtils
                    .escapeHtml(
                      request.request_status
                    )
                }

              </span>

            </td>

            <td>

              <button
                type="button"
                class="btn btn-primary"
                data-mint-request="${
                  Number(
                    request.id
                  )
                }"
              >
                Approve & Mint
              </button>

            </td>

          </tr>

        `
      ).join("");


    tokenRequestsTableBody
      .querySelectorAll(
        "[data-mint-request]"
      )
      .forEach(
        (button) => {

          button.addEventListener(
            "click",
            () => {

              mintTokenRequest(
                Number(
                  button.dataset
                    .mintRequest
                )
              );
            }
          );
        }
      );


  } catch (error) {

    tokenRequestsTableBody.innerHTML =
      `<tr>
        <td colspan="6">
          ${
            window.PeraSoulUtils
              .escapeHtml(
                error.message
              )
          }
        </td>
      </tr>`;
  }
}


// ==========================================================
// APPROVE REQUEST + MINT TOKEN
// ==========================================================

async function mintTokenRequest(
  requestId
) {

  if (
    !window.confirm(
      `Approve token request ${requestId} and submit the Sepolia mint transaction?`
    )
  ) {

    return;
  }


  try {

    showMessage(
      "Submitting token mint transaction to Ethereum Sepolia..."
    );


    const response =
      await fetch(
        `${API_BASE_URL}/admin/approve-request/${requestId}`,
        {
          method:
            "POST",

          headers:
            authHeaders()
        }
      );


    const data =
      await window.PeraSoulUtils
        .jsonResponse(response);


    showMessage(
      `Token minted successfully. Transaction: ${data.tx_hash}`,
      "success"
    );


    await Promise.all([
      loadDashboardStatistics(),
      loadTokenRequests(),
      loadActiveTokens()
    ]);


  } catch (error) {

    showMessage(
      error.message
      || "Token minting failed.",
      "error"
    );
  }
}


// ==========================================================
// TOKEN STATUS BADGE
// ==========================================================

function tokenBadge(
  status
) {

  const normalized =
    String(
      status || ""
    ).toLowerCase();


  if (
    normalized === "active"
  ) {

    return "badge-success";
  }


  if (
    normalized.includes(
      "tempor"
    )
  ) {

    return "badge-warning";
  }


  if (
    normalized.includes(
      "revoked"
    )
  ) {

    return "badge-danger";
  }


  return "badge-blue";
}


// ==========================================================
// LOAD ACTIVE TOKENS
// ==========================================================

async function loadActiveTokens() {

  if (!activeTokensTableBody) {
    return;
  }


  activeTokensTableBody.innerHTML =
    '<tr><td colspan="7">Loading issued student identities...</td></tr>';


  try {

    const response =
      await fetch(
        `${API_BASE_URL}/admin/active-tokens`,
        {
          headers:
            authHeaders()
        }
      );


    const tokens =
      await window.PeraSoulUtils
        .jsonResponse(response);


    if (
      !Array.isArray(tokens)
      || !tokens.length
    ) {

      activeTokensTableBody.innerHTML =
        '<tr><td colspan="7">No issued student identities were found.</td></tr>';

      return;
    }


    activeTokensTableBody.innerHTML =
      tokens.map(
        (token) => {

          const userId =
            Number(
              token.student_user_id
            );


          const wallet =
            token.wallet_address
            || "";


          const encodedWallet =
            encodeURIComponent(
              wallet
            );


          return `

            <tr>

              <td>
                ${
                  window.PeraSoulUtils
                    .escapeHtml(
                      token.student_number
                    )
                }
              </td>

              <td>
                ${
                  window.PeraSoulUtils
                    .escapeHtml(
                      token.full_name
                    )
                }
              </td>

              <td>
                ${
                  window.PeraSoulUtils
                    .escapeHtml(
                      token.department
                    )
                }
              </td>

              <td
                title="${
                  window.PeraSoulUtils
                    .escapeHtml(
                      wallet
                    )
                }"
              >

                ${
                  window.PeraSoulUtils
                    .escapeHtml(
                      window.PeraSoulUtils
                        .shortenValue(
                          wallet,
                          6,
                          4
                        )
                    )
                }

              </td>

              <td>
                ${
                  window.PeraSoulUtils
                    .escapeHtml(
                      token.token_id
                    )
                }
              </td>

              <td>

                <span
                  class="badge ${
                    tokenBadge(
                      token.token_status
                    )
                  }"
                >

                  ${
                    window.PeraSoulUtils
                      .escapeHtml(
                        window.PeraSoulUtils
                          .formatStatus(
                            token.token_status
                          )
                      )
                  }

                </span>

              </td>

              <td>

                <div class="table-actions">

                  <a
                    class="btn btn-danger"
                    href="admin-burn.html?student_user_id=${userId}&wallet=${encodedWallet}"
                  >
                    Permanent Revoke
                  </a>

                  <a
                    class="btn btn-outline"
                    href="admin-replace-wallet.html?student_user_id=${userId}&wallet=${encodedWallet}"
                  >
                    Replace Wallet
                  </a>

                </div>

              </td>

            </tr>

          `;
        }
      ).join("");


  } catch (error) {

    activeTokensTableBody.innerHTML =
      `<tr>
        <td colspan="7">
          ${
            window.PeraSoulUtils
              .escapeHtml(
                error.message
              )
          }
        </td>
      </tr>`;
  }
}


// ==========================================================
// INITIALIZE UNIVERSITY ADMIN DASHBOARD
// ==========================================================

async function initializeAdminDashboard() {

  showMessage(
    "Verifying University Administrator wallet session..."
  );


  const validSession =
    await verifyAdminSession();


  if (!validSession) {

    return;
  }


  const results =
    await Promise.allSettled([
      loadDashboardStatistics(),
      loadPendingStudents(),
      loadTokenRequests(),
      loadActiveTokens()
    ]);


  if (
    results.some(
      (result) =>
        result.status ===
        "rejected"
    )
  ) {

    console.error(
      "One or more dashboard loaders failed:",
      results
    );


    showMessage(
      "University Administrator session verified, but some dashboard data could not be loaded.",
      "error"
    );

  } else {

    showMessage(
      "University Administrator dashboard loaded successfully.",
      "success"
    );
  }
}


// ==========================================================
// EVENT LISTENERS
// ==========================================================

document
  .getElementById(
    "topLogoutButton"
  )
  ?.addEventListener(
    "click",
    logoutAdmin
  );


document
  .getElementById(
    "sidebarLogoutButton"
  )
  ?.addEventListener(
    "click",
    logoutAdmin
  );


document
  .getElementById(
    "refreshStudentsButton"
  )
  ?.addEventListener(
    "click",
    loadPendingStudents
  );


document
  .getElementById(
    "refreshRequestsButton"
  )
  ?.addEventListener(
    "click",
    loadTokenRequests
  );


document
  .getElementById(
    "refreshActiveTokensButton"
  )
  ?.addEventListener(
    "click",
    loadActiveTokens
  );


// ==========================================================
// START
// ==========================================================

initializeAdminDashboard();