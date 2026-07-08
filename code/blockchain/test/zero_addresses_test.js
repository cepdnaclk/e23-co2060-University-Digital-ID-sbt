import { expect } from "chai";
import hre from "hardhat";

describe("PeraSoul Test Category", function () {
  let ethers;
  let peraSoul;
  let manager;
  let owner;
  let student1;
  let student2;
  let attacker;
  let zeroAddress;

  beforeEach(async function () {
    const connection = await hre.network.getOrCreate();
    ethers = connection.ethers;

    [owner, student1, student2, attacker] = await ethers.getSigners();
    zeroAddress = "0x0000000000000000000000000000000000000000";

    const PeraSoul = await ethers.getContractFactory("PeraSoul");
    peraSoul = await PeraSoul.deploy();

    const PeraSoulManager = await ethers.getContractFactory("PeraSoulManager");
    manager = await PeraSoulManager.deploy(await peraSoul.getAddress());

    await peraSoul.transferOwnership(await manager.getAddress());
    });

  it("should reject minting to zero address", async function () {
  await expect(
    manager.mintStudentToken(zeroAddress)
  ).to.be.revertedWith("Invalid Student Address");
  });

  it("should reject wallet replacement with zero old wallet", async function () {
  await expect(
    manager.replaceStudentWallet(zeroAddress, student2.address)
  ).to.be.revertedWith("Invalid old wallet");
  });

it("should reject wallet replacement with zero new wallet", async function () {
  await manager.mintStudentToken(student1.address);

  await expect(
    manager.replaceStudentWallet(student1.address, zeroAddress)
  ).to.be.revertedWith("Invalid new wallet");
  });
});