import hre from "hardhat";
import fs from "fs";

async function main() {
  const { ethers } = await hre.network.connect();

  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts using account:", deployer.address);

  const PeraSoul = await ethers.getContractFactory("PeraSoul");
  const peraSoul = await PeraSoul.deploy();
  await peraSoul.waitForDeployment();

  const peraSoulAddress = await peraSoul.getAddress();
  console.log("PeraSoul deployed to:", peraSoulAddress);

  const PeraSoulManager = await ethers.getContractFactory("PeraSoulManager");
  const manager = await PeraSoulManager.deploy(peraSoulAddress);
  await manager.waitForDeployment();

  const managerAddress = await manager.getAddress();
  console.log("PeraSoulManager deployed to:", managerAddress);

  const tx = await peraSoul.transferOwnership(managerAddress);
  await tx.wait();

  console.log("Ownership of PeraSoul transferred to PeraSoulManager");

  const addresses = {
    peraSoul: peraSoulAddress,
    manager: managerAddress,
  };

  fs.writeFileSync(
    "deployed-addresses.json",
    JSON.stringify(addresses, null, 2)
  );

  console.log("Contract addresses saved to deployed-addresses.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});