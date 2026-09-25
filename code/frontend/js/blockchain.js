(() => {
  "use strict";

  // The frontend does not sign university blockchain transactions directly.
  // Contract addresses and the administrator signing key remain backend concerns.
  window.PeraSoulBlockchain = Object.freeze({
    network: "sepolia",
    chainIdDecimal: 11155111,
    chainIdHex: "0xaa36a7",
    explorerTransactionBase: "https://sepolia.etherscan.io/tx/"
  });
})();
