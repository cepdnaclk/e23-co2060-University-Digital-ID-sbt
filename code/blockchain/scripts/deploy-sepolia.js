import hre from "hardhat";
import fs from "fs";

async function main() {
  const { ethers } = await hre.network.getOrCreate();

  const [deployer] = await ethers.getSigners();

  console.log("Deploying with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH");

  const PeraSoul = await ethers.getContractFactory("PeraSoul");

  const peraSoul = await PeraSoul.deploy({
    gasLimit: 3000000,
  });

  await peraSoul.waitForDeployment();

  const peraSoulAddress = await peraSoul.getAddress();
  console.log("PeraSoul deployed to:", peraSoulAddress);

  const PeraSoulManager = await ethers.getContractFactory("PeraSoulManager");

  const manager = await PeraSoulManager.deploy(peraSoulAddress, {
    gasLimit: 3000000,
  });

  await manager.waitForDeployment();

  const managerAddress = await manager.getAddress();
  console.log("PeraSoulManager deployed to:", managerAddress);

  const tx = await peraSoul.transferOwnership(managerAddress, {
    gasLimit: 100000,
  });

  await tx.wait();

  console.log("Ownership transferred to PeraSoulManager");

  fs.writeFileSync(
    "deployment-sepolia.json",
    JSON.stringify(
      {
        network: "sepolia",
        deployer: deployer.address,
        peraSoul: peraSoulAddress,
        peraSoulManager: managerAddress,
      },
      null,
      2
    )
  );

  console.log("Deployment data saved to deployment-sepolia.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});