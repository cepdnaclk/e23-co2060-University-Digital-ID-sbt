const API_BASE_URL =
  window.PeraSoulUtils.apiBaseUrl();

const adminToken =
  sessionStorage.getItem(
    "adminAccessToken"
  );


// ==========================================================
// PAGE ELEMENTS
// ==========================================================

const technicalAdminMessage =
  document.getElementById(
    "technicalAdminMessage"
  );

const createUniversityAdminForm =
  document.getElementById(
    "createUniversityAdminForm"
  );

const createAdminMessage =
  document.getElementById(
    "createAdminMessage"
  );

const universityAdminsTableBody =
  document.getElementById(
    "universityAdminsTableBody"
  );

const changeAdminWalletForm =
  document.getElementById(
    "changeAdminWalletForm"
  );

const walletChangeMessage =
  document.getElementById(
    "walletChangeMessage"
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
// STATUS MESSAGE HELPERS
// ==========================================================

function showMainMessage(
  message,
  type = ""
) {

  if (!technicalAdminMessage) {
    return;
  }

  technicalAdminMessage.textContent =
    message;

  technicalAdminMessage.className =
    `status ${type}`;
}


function showCreateMessage(
  message,
  type = ""
) {

  if (!createAdminMessage) {
    return;
  }

  createAdminMessage.textContent =
    message;

  createAdminMessage.className =
    `status ${type}`;
}


function showWalletMessage(
  message,
  type = ""
) {

  if (!walletChangeMessage) {
    return;
  }

  walletChangeMessage.textContent =
    message;

  walletChangeMessage.className =
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
// VERIFY TECHNICAL ADMIN SESSION
// ==========================================================

async function verifyTechnicalAdminSession() {

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
    // Redirect University Admin to its own dashboard
    // ------------------------------------------------------

    if (
      data.role ===
      "university_admin"
    ) {

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
        || "University Administrator"
      );


      window.location.href =
        "admin-dashboard.html";

      return false;
    }


    // ------------------------------------------------------
    // Reject any non-technical-admin role
    // ------------------------------------------------------

    if (
      data.role !==
      "technical_admin"
    ) {

      throw new Error(
        "Technical Administrator access required."
      );
    }


    // ------------------------------------------------------
    // Store verified session data
    // ------------------------------------------------------

    const displayName =
      data.display_name
      || "Technical Administrator";


    const wallet =
      data.wallet_address
      || "";


    sessionStorage.setItem(
      "adminRole",
      data.role
    );

    sessionStorage.setItem(
      "adminDisplayName",
      displayName
    );

    sessionStorage.setItem(
      "adminWallet",
      wallet
    );


    // ------------------------------------------------------
    // Display administrator name
    // ------------------------------------------------------

    const nameElement =
      document.getElementById(
        "loggedTechnicalAdminName"
      );


    if (nameElement) {

      nameElement.textContent =
        displayName;
    }


    // ------------------------------------------------------
    // Display shortened wallet
    // ------------------------------------------------------

    const shortWalletElement =
      document.getElementById(
        "loggedTechnicalAdminWallet"
      );


    if (shortWalletElement) {

      shortWalletElement.textContent =
        window.PeraSoulUtils
          .shortenValue(
            wallet,
            6,
            4
          );

      shortWalletElement.title =
        wallet;
    }


    // ------------------------------------------------------
    // Display full wallet
    // ------------------------------------------------------

    const fullWalletElement =
      document.getElementById(
        "technicalAdminWalletDisplay"
      );


    if (fullWalletElement) {

      fullWalletElement.textContent =
        wallet || "-";

      fullWalletElement.title =
        wallet;
    }


    return true;


  } catch (error) {

    console.error(
      "Technical Administrator session verification failed:",
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
// ADMIN STATUS BADGE
// ==========================================================

function adminStatusBadge(
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
    normalized === "disabled"
  ) {

    return "badge-danger";
  }


  return "badge-warning";
}


// ==========================================================
// UPDATE STATISTICS
// ==========================================================

function updateAdminStatistics(
  admins
) {

  const total =
    admins.length;


  const active =
    admins.filter(
      (admin) =>
        admin.status === "active"
    ).length;


  const disabled =
    admins.filter(
      (admin) =>
        admin.status === "disabled"
    ).length;


  const totalElement =
    document.getElementById(
      "totalUniversityAdmins"
    );

  const activeElement =
    document.getElementById(
      "activeUniversityAdmins"
    );

  const disabledElement =
    document.getElementById(
      "disabledUniversityAdmins"
    );


  if (totalElement) {
    totalElement.textContent =
      total;
  }


  if (activeElement) {
    activeElement.textContent =
      active;
  }


  if (disabledElement) {
    disabledElement.textContent =
      disabled;
  }
}


// ==========================================================
// LOAD UNIVERSITY ADMINISTRATORS
// ==========================================================

async function loadUniversityAdmins() {

  if (!universityAdminsTableBody) {
    return;
  }


  universityAdminsTableBody.innerHTML =
    `
      <tr>
        <td colspan="7">
          Loading University Administrators...
        </td>
      </tr>
    `;


  try {

    const response =
      await fetch(
        `${API_BASE_URL}/technical-admin/admins`,
        {
          headers:
            authHeaders()
        }
      );


    const admins =
      await window.PeraSoulUtils
        .jsonResponse(response);


    if (!Array.isArray(admins)) {

      throw new Error(
        "Unexpected administrator response from backend."
      );
    }


    updateAdminStatistics(
      admins
    );


    if (!admins.length) {

      universityAdminsTableBody.innerHTML =
        `
          <tr>
            <td colspan="7">
              No University Administrators
              have been registered yet.
            </td>
          </tr>
        `;

      return;
    }


    universityAdminsTableBody.innerHTML =
      admins.map(
        (admin) => {

          const adminId =
            Number(
              admin.id
            );


          const wallet =
            admin.wallet_address
            || "";


          const status =
            String(
              admin.status
              || ""
            ).toLowerCase();


          const isActive =
            status === "active";


          return `

            <tr>

              <td>
                ${
                  window.PeraSoulUtils
                    .escapeHtml(
                      admin.id
                    )
                }
              </td>


              <td>

                <strong>
                  ${
                    window.PeraSoulUtils
                      .escapeHtml(
                        admin.full_name
                        || "Unnamed Administrator"
                      )
                  }
                </strong>

                ${
                  admin.email
                    ? `
                      <br>
                      <small>
                        ${
                          window.PeraSoulUtils
                            .escapeHtml(
                              admin.email
                            )
                        }
                      </small>
                    `
                    : ""
                }

              </td>


              <td>
                ${
                  window.PeraSoulUtils
                    .escapeHtml(
                      admin.designation
                      || "-"
                    )
                }
              </td>


              <td>
                ${
                  window.PeraSoulUtils
                    .escapeHtml(
                      admin.department
                      || "-"
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

                <span
                  class="badge ${
                    adminStatusBadge(
                      status
                    )
                  }"
                >

                  ${
                    window.PeraSoulUtils
                      .escapeHtml(
                        window.PeraSoulUtils
                          .formatStatus(
                            status
                          )
                      )
                  }

                </span>

              </td>


              <td>

                <div class="table-actions">


                  <button
                    type="button"
                    class="${
                      isActive
                        ? "btn btn-danger"
                        : "btn btn-primary"
                    }"
                    data-admin-status-id="${adminId}"
                    data-admin-next-status="${
                      isActive
                        ? "disabled"
                        : "active"
                    }"
                  >

                    ${
                      isActive
                        ? "Disable"
                        : "Activate"
                    }

                  </button>


                  <button
                    type="button"
                    class="btn btn-outline"
                    data-change-wallet-id="${adminId}"
                    data-change-wallet-current="${
                      window.PeraSoulUtils
                        .escapeHtml(
                          wallet
                        )
                    }"
                  >
                    Change Wallet
                  </button>


                </div>

              </td>

            </tr>

          `;
        }
      ).join("");


    attachAdminActionListeners();


  } catch (error) {

    universityAdminsTableBody.innerHTML =
      `
        <tr>
          <td colspan="7">
            ${
              window.PeraSoulUtils
                .escapeHtml(
                  error.message
                  || "Unable to load administrators."
                )
            }
          </td>
        </tr>
      `;


    showMainMessage(
      error.message
      || "Unable to load University Administrators.",
      "error"
    );
  }
}


// ==========================================================
// ATTACH TABLE BUTTON EVENTS
// ==========================================================

function attachAdminActionListeners() {

  document
    .querySelectorAll(
      "[data-admin-status-id]"
    )
    .forEach(
      (button) => {

        button.addEventListener(
          "click",
          () => {

            const adminId =
              Number(
                button.dataset
                  .adminStatusId
              );


            const newStatus =
              button.dataset
                .adminNextStatus;


            updateUniversityAdminStatus(
              adminId,
              newStatus
            );
          }
        );
      }
    );


  document
    .querySelectorAll(
      "[data-change-wallet-id]"
    )
    .forEach(
      (button) => {

        button.addEventListener(
          "click",
          () => {

            const adminId =
              Number(
                button.dataset
                  .changeWalletId
              );


            prepareWalletChange(
              adminId
            );
          }
        );
      }
    );
}


// ==========================================================
// CREATE UNIVERSITY ADMINISTRATOR
// ==========================================================

async function createUniversityAdmin(
  event
) {

  event.preventDefault();


  const fullName =
    document.getElementById(
      "newAdminFullName"
    )
    ?.value
    .trim();


  const wallet =
    document.getElementById(
      "newAdminWallet"
    )
    ?.value
    .trim()
    .toLowerCase();


  const designation =
    document.getElementById(
      "newAdminDesignation"
    )
    ?.value
    .trim();


  const department =
    document.getElementById(
      "newAdminDepartment"
    )
    ?.value
    .trim();


  const email =
    document.getElementById(
      "newAdminEmail"
    )
    ?.value
    .trim();


  const phone =
    document.getElementById(
      "newAdminPhone"
    )
    ?.value
    .trim();


  // ------------------------------------------------------
  // Frontend validation
  // ------------------------------------------------------

  if (
    !fullName
    || fullName.length < 2
  ) {

    showCreateMessage(
      "Enter the administrator's full name.",
      "error"
    );

    return;
  }


  if (
    !window.PeraSoulUtils
      .isEthereumAddress(
        wallet
      )
  ) {

    showCreateMessage(
      "Enter a valid Ethereum wallet address.",
      "error"
    );

    return;
  }


  const confirmed =
    window.confirm(
      `Create a University Administrator account for ${fullName}?\n\nWallet: ${wallet}`
    );


  if (!confirmed) {
    return;
  }


  const createButton =
    document.getElementById(
      "createAdminButton"
    );


  if (createButton) {

    createButton.disabled =
      true;

    createButton.textContent =
      "Creating Administrator...";
  }


  try {

    showCreateMessage(
      "Creating University Administrator..."
    );


    const response =
      await fetch(
        `${API_BASE_URL}/technical-admin/admins`,
        {
          method:
            "POST",

          headers:
            authHeaders(),

          body:
            JSON.stringify({

              wallet_address:
                wallet,

              full_name:
                fullName,

              designation:
                designation || null,

              department:
                department || null,

              email:
                email || null,

              phone:
                phone || null
            })
        }
      );


    const data =
      await window.PeraSoulUtils
        .jsonResponse(response);


    showCreateMessage(
      `University Administrator ${data.full_name || fullName} created successfully.`,
      "success"
    );


    createUniversityAdminForm
      ?.reset();


    await loadUniversityAdmins();


    showMainMessage(
      "University Administrator account created successfully.",
      "success"
    );


  } catch (error) {

    showCreateMessage(
      error.message
      || "Unable to create University Administrator.",
      "error"
    );


  } finally {

    if (createButton) {

      createButton.disabled =
        false;

      createButton.textContent =
        "Create University Administrator";
    }
  }
}


// ==========================================================
// ACTIVATE / DISABLE UNIVERSITY ADMIN
// ==========================================================

async function updateUniversityAdminStatus(
  adminId,
  newStatus
) {

  if (
    !["active", "disabled"]
      .includes(
        newStatus
      )
  ) {

    return;
  }


  const actionText =
    newStatus === "active"
      ? "activate"
      : "disable";


  const confirmed =
    window.confirm(
      `Are you sure you want to ${actionText} University Administrator user ${adminId}?`
    );


  if (!confirmed) {
    return;
  }


  try {

    showMainMessage(
      `${
        newStatus === "active"
          ? "Activating"
          : "Disabling"
      } University Administrator...`
    );


    const response =
      await fetch(
        `${API_BASE_URL}/technical-admin/admins/${adminId}/status`,
        {
          method:
            "PATCH",

          headers:
            authHeaders(),

          body:
            JSON.stringify({
              status:
                newStatus
            })
        }
      );


    const data =
      await window.PeraSoulUtils
        .jsonResponse(response);


    showMainMessage(
      `University Administrator user ${data.id} is now ${data.status}.`,
      "success"
    );


    await loadUniversityAdmins();


  } catch (error) {

    showMainMessage(
      error.message
      || "Unable to update administrator status.",
      "error"
    );
  }
}


// ==========================================================
// PREPARE WALLET CHANGE FORM
// ==========================================================

function prepareWalletChange(
  adminId
) {

  const adminIdInput =
    document.getElementById(
      "walletChangeAdminId"
    );


  const walletInput =
    document.getElementById(
      "newAdminWalletAddress"
    );


  if (adminIdInput) {

    adminIdInput.value =
      adminId;
  }


  if (walletInput) {

    walletInput.value =
      "";

    walletInput.focus();
  }


  showWalletMessage(
    `Enter the new MetaMask wallet for University Administrator user ${adminId}.`
  );


  const walletSection =
    document.getElementById(
      "wallet-change-section"
    );


  walletSection
    ?.scrollIntoView({
      behavior:
        "smooth",

      block:
        "start"
    });
}


// ==========================================================
// CHANGE UNIVERSITY ADMIN WALLET
// ==========================================================

async function changeUniversityAdminWallet(
  event
) {

  event.preventDefault();


  const adminId =
    Number(
      document.getElementById(
        "walletChangeAdminId"
      )
      ?.value
    );


  const newWallet =
    document.getElementById(
      "newAdminWalletAddress"
    )
    ?.value
    .trim()
    .toLowerCase();


  if (
    !Number.isInteger(adminId)
    || adminId <= 0
  ) {

    showWalletMessage(
      "Enter a valid University Administrator user ID.",
      "error"
    );

    return;
  }


  if (
    !window.PeraSoulUtils
      .isEthereumAddress(
        newWallet
      )
  ) {

    showWalletMessage(
      "Enter a valid new Ethereum wallet address.",
      "error"
    );

    return;
  }


  const confirmed =
    window.confirm(
      `Change the wallet for University Administrator user ${adminId}?\n\nNew wallet: ${newWallet}\n\nThe administrator will need to log in again using the new wallet.`
    );


  if (!confirmed) {
    return;
  }


  const changeWalletButton =
    document.getElementById(
      "changeWalletButton"
    );


  if (changeWalletButton) {

    changeWalletButton.disabled =
      true;

    changeWalletButton.textContent =
      "Updating Wallet...";
  }


  try {

    showWalletMessage(
      "Updating University Administrator wallet..."
    );


    const response =
      await fetch(
        `${API_BASE_URL}/technical-admin/admins/${adminId}/wallet`,
        {
          method:
            "PATCH",

          headers:
            authHeaders(),

          body:
            JSON.stringify({

              new_wallet_address:
                newWallet
            })
        }
      );


    const data =
      await window.PeraSoulUtils
        .jsonResponse(response);


    showWalletMessage(
      `Administrator wallet updated successfully to ${data.wallet_address}.`,
      "success"
    );


    changeAdminWalletForm
      ?.reset();


    await loadUniversityAdmins();


    showMainMessage(
      "University Administrator wallet updated successfully.",
      "success"
    );


  } catch (error) {

    showWalletMessage(
      error.message
      || "Unable to update administrator wallet.",
      "error"
    );


  } finally {

    if (changeWalletButton) {

      changeWalletButton.disabled =
        false;

      changeWalletButton.textContent =
        "Update Administrator Wallet";
    }
  }
}


// ==========================================================
// REFRESH ADMIN LIST
// ==========================================================

async function refreshUniversityAdmins() {

  showMainMessage(
    "Refreshing University Administrator accounts..."
  );


  await loadUniversityAdmins();


  showMainMessage(
    "University Administrator list refreshed.",
    "success"
  );
}


// ==========================================================
// INITIALIZE TECHNICAL ADMIN DASHBOARD
// ==========================================================

async function initializeTechnicalAdminDashboard() {

  showMainMessage(
    "Verifying Technical Administrator wallet session..."
  );


  const validSession =
    await verifyTechnicalAdminSession();


  if (!validSession) {
    return;
  }


  try {

    await loadUniversityAdmins();


    showMainMessage(
      "Technical Administrator dashboard loaded successfully.",
      "success"
    );


  } catch (error) {

    console.error(
      "Technical Administrator dashboard initialization failed:",
      error
    );


    showMainMessage(
      error.message
      || "Unable to load Technical Administrator dashboard.",
      "error"
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
    "refreshAdminsButton"
  )
  ?.addEventListener(
    "click",
    refreshUniversityAdmins
  );


createUniversityAdminForm
  ?.addEventListener(
    "submit",
    createUniversityAdmin
  );


changeAdminWalletForm
  ?.addEventListener(
    "submit",
    changeUniversityAdminWallet
  );


// ==========================================================
// START
// ==========================================================

initializeTechnicalAdminDashboard();