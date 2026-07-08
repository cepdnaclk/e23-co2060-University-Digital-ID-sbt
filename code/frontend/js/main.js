
function showMessage(id, message, type = "success") {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = "status";
  el.textContent = message;
}

function makeWallet() {
  return "0x" + Math.random().toString(16).slice(2, 42).padEnd(40, "a");
}

function connectWallet(inputId, statusId = "status") {
  const wallet = makeWallet();
  const input = document.getElementById(inputId);
  if (input) input.value = wallet;
  localStorage.setItem("pera_wallet", wallet);
  showMessage(statusId, "Wallet connected successfully: " + wallet.slice(0, 10) + "..." + wallet.slice(-6));
}

function registerStudent(event) {
  event.preventDefault();
  const wallet = document.getElementById("walletAddress")?.value;
  if (!wallet) {
    showMessage("status", "Please connect your wallet before submitting registration.");
    return;
  }
  window.location.href = "registration-success.html";
}

function loginStudent(event) {
  event.preventDefault();
  window.location.href = "student-dashboard.html";
}

function loginAdmin(event) {
  event.preventDefault();
  window.location.href = "admin-dashboard.html";
}

function demoAction(id, action) {
  showMessage(id, action + " completed in prototype mode. Smart contract and backend integration will be added later.");
}

function generateQR() {
  const qr = document.getElementById("qrBox");
  if (qr) qr.innerHTML = "PeraSoul<br>Verify";
  demoAction("studentStatus", "QR generation");
}

function startCountdown() {
  let seconds = Number(document.getElementById("countdownSeconds")?.value || 30);
  const output = document.getElementById("countdownOutput");
  const timer = setInterval(() => {
    if (output) output.textContent = "Temporary revocation remaining: " + seconds + " seconds";
    seconds -= 1;
    if (seconds < 0) {
      clearInterval(timer);
      if (output) output.textContent = "Countdown finished. Token is valid again.";
    }
  }, 1000);
}
