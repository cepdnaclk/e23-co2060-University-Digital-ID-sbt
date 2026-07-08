import "dotenv/config";

console.log("RPC URL:", process.env.SEPOLIA_RPC_URL);
console.log("Private key exists:", process.env.SEPOLIA_PRIVATE_KEY ? "YES" : "NO");