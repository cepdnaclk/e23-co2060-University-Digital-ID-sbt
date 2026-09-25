(() => {
  "use strict";

  function apiBaseUrl() {
    if (typeof window.PERASOUL_API_BASE_URL === "string" &&
        window.PERASOUL_API_BASE_URL.trim()) {
      return window.PERASOUL_API_BASE_URL.replace(/\/+$/, "");
    }

    const protocol =
      window.location.protocol === "https:" ? "https:" : "http:";
    const host = window.location.hostname || "127.0.0.1";

    return `${protocol}//${host}:8000`;
  }

  function isEthereumAddress(value) {
    return /^0x[a-fA-F0-9]{40}$/.test(String(value || "").trim());
  }

  function shortenValue(value, start = 8, end = 6) {
    const text = String(value || "");
    if (!text || text.length <= start + end + 3) {
      return text || "-";
    }
    return `${text.slice(0, start)}...${text.slice(-end)}`;
  }

  function formatStatus(value) {
    if (!value) return "Not Available";
    return String(value)
      .replaceAll("_", " ")
      .replace(/\b\w/g, (ch) => ch.toUpperCase());
  }

  function escapeHtml(value) {
    if (value === null || value === undefined) return "-";
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  async function jsonResponse(response) {
    let data = {};
    try {
      data = await response.json();
    } catch (_) {
      data = {};
    }

    if (!response.ok) {
      const detail =
        typeof data.detail === "string"
          ? data.detail
          : `Request failed with status ${response.status}.`;
      throw new Error(detail);
    }

    return data;
  }

  function clearAdminSession() {
    [
      "adminAccessToken",
      "adminUserId",
      "adminUsername",
      "adminRole",
      "adminWallet",
      "adminDisplayName"
    ].forEach((key) => sessionStorage.removeItem(key));
  }

  function clearStudentSession() {
    [
      "studentWalletAddress",
      "studentUserId",
      "studentRole",
      "studentAccountStatus"
    ].forEach((key) => sessionStorage.removeItem(key));
  }

  window.PeraSoulUtils = Object.freeze({
    apiBaseUrl,
    isEthereumAddress,
    shortenValue,
    formatStatus,
    escapeHtml,
    jsonResponse,
    clearAdminSession,
    clearStudentSession
  });
})();
