import hre from "hardhat";
import fs from "fs";

async function main() {
  const { ethers } = await hre.network.connect();

  const addresses = JSON.parse(
    fs.readFileSync("deployed-addresses.json", "utf8")
  );

  const [owner, student1, student2] = await ethers.getSigners();

  const peraSoul = await ethers.getContractAt("PeraSoul", addresses.peraSoul);
  const manager = await ethers.getContractAt(
    "PeraSoulManager",
    addresses.manager
  );

  console.log("Student 1 wallet:", student1.address);
  console.log("Student 2 wallet:", student2.address);

  console.log("\n1. Minting token to Student 1...");
  let tx = await manager.mintStudentToken(student1.address);
  await tx.wait();

  let hasToken = await peraSoul.hasToken(student1.address);
  let tokenId = await peraSoul.studentToken(student1.address);
  let isValid = await manager.verifyStudent(student1.address);

  console.log("Student 1 has token:", hasToken);
  console.log("Student 1 token ID:", tokenId.toString());
  console.log("Student 1 verification status before revoke:", isValid);

  console.log("\n2. Temporarily revoking Student 1 for 5 seconds...");
  tx = await manager.revokeTemporarily(student1.address, 5);
  await tx.wait();

  isValid = await manager.verifyStudent(student1.address);
  let remainingTime = await manager.getRemainingRevocationTime(student1.address);

  console.log("Verification immediately after temporary revoke:", isValid);
  console.log("Remaining revocation time:", remainingTime.toString(), "seconds");

  console.log("\n3. Increasing local blockchain time by 6 seconds...");
  await ethers.provider.send("evm_increaseTime", [6]);
  await ethers.provider.send("evm_mine", []);

  isValid = await manager.verifyStudent(student1.address);
  remainingTime = await manager.getRemainingRevocationTime(student1.address);

  console.log("Verification after revocation time expired:", isValid);
  console.log("Remaining revocation time:", remainingTime.toString(), "seconds");

  console.log("\n4. Permanently revoking Student 1...");
  tx = await manager.revokePermanently(student1.address);
  await tx.wait();

  hasToken = await peraSoul.hasToken(student1.address);
  isValid = await manager.verifyStudent(student1.address);

  console.log("Student 1 has token after burn:", hasToken);
  console.log("Verification after permanent revoke:", isValid);

  console.log("\n5. Minting token again to Student 1...");
  tx = await manager.mintStudentToken(student1.address);
  await tx.wait();

  tokenId = await peraSoul.studentToken(student1.address);
  console.log("New token ID:", tokenId.toString());

  console.log("\n6. Replacing Student 1 wallet with Student 2 wallet...");
  tx = await manager.replaceStudentWallet(student1.address, student2.address);
  await tx.wait();

  const student1Status = await peraSoul.hasToken(student1.address);
  const student2Status = await peraSoul.hasToken(student2.address);

  console.log("Student 1 has token:", student1Status);
  console.log("Student 2 has token:", student2Status);

  console.log("\nLocal blockchain interaction completed successfully.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});