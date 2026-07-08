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

  it("should reject wallet replacement when old and new wallet are same", async function () {
  await manager.mintStudentToken(student1.address);

  await expect(
    manager.replaceStudentWallet(student1.address, student1.address)
  ).to.be.revertedWith("Wallets must be different");
  });

  it("should reject wallet replacement if old wallet has no token", async function () {
  await expect(
    manager.replaceStudentWallet(student1.address, student2.address)
  ).to.be.revertedWith("Old wallet has no token");
  });

  it("should reject wallet replacement if new wallet already has token", async function () {
  await manager.mintStudentToken(student1.address);
  await manager.mintStudentToken(student2.address);

  await expect(
    manager.replaceStudentWallet(student1.address, student2.address)
  ).to.be.revertedWith("New wallet already has token");
  });

});