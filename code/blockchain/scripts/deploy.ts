import { network } from "hardhat";

const { ethers } = await network.create();

console.log("Deploying PeraSoul...");

const peraSoul = await ethers.deployContract("PeraSoul");
await peraSoul.waitForDeployment();

const peraSoulAddress = await peraSoul.getAddress();
console.log("PeraSoul deployed to:", peraSoulAddress);

console.log("Deploying PeraSoulManager...");

const manager = await ethers.deployContract("PeraSoulManager", [
  peraSoulAddress,
]);

await manager.waitForDeployment();

const managerAddress = await manager.getAddress();
console.log("PeraSoulManager deployed to:", managerAddress);

console.log("Transferring ownership of PeraSoul to PeraSoulManager...");

const tx = await peraSoul.transferOwnership(managerAddress);
await tx.wait();

console.log("Ownership transferred successfully.");
console.log("--------------------------------");
console.log("PeraSoul:", peraSoulAddress);
console.log("PeraSoulManager:", managerAddress);
console.log("--------------------------------");