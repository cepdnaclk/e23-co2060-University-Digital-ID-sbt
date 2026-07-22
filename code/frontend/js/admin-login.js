const API_BASE_URL = "http://127.0.0.1:8000";

const adminLoginForm = document.getElementById("adminLoginForm");
const usernameInput = document.getElementById("adminUsername");
const passwordInput = document.getElementById("adminPassword");
const loginMessage = document.getElementById("loginMessage");
const loginButton = document.getElementById("adminLoginButton");


function showLoginMessage(message, type = "error") {
  loginMessage.textContent = message;
  loginMessage.className = `form-message ${type}`;
}


function setLoading(isLoading) {
  loginButton.disabled = isLoading;
  loginButton.textContent = isLoading
    ? "Signing in..."
    : "Enter Admin Dashboard";
}


adminLoginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const username = usernameInput.value.trim();
  const password = passwordInput.value;

  showLoginMessage("");

  if (!username || !password) {
    showLoginMessage("Please enter both username and password.");
    return;
  }

  setLoading(true);

  try {
    const response = await fetch(
      `${API_BASE_URL}/admin-auth/login`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username: username,
          password: password
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.detail || "Administrator login failed."
      );
    }

    sessionStorage.setItem(
      "adminAccessToken",
      data.access_token
    );

    sessionStorage.setItem(
      "adminUserId",
      String(data.user_id)
    );

    sessionStorage.setItem(
      "adminUsername",
      data.username
    );

    sessionStorage.setItem(
      "adminRole",
      data.role
    );

    showLoginMessage(
      "Login successful. Opening dashboard...",
      "success"
    );

    window.location.href = "../pages/admin-dashboard.html";

  } catch (error) {
    console.error("Admin login error:", error);

    showLoginMessage(
      error.message || "Unable to connect to the backend."
    );

  } finally {
    setLoading(false);
  }
});