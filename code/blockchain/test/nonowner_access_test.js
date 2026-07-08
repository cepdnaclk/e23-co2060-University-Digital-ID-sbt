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
  
  it("should reject non-owner temporary revocation", async function () {
  await manager.mintStudentToken(student1.address);

  await expect(
    manager.connect(attacker).revokeTemporarily(student1.address, 10)
  )
    .to.be.revertedWithCustomError(manager, "OwnableUnauthorizedAccount")
    .withArgs(attacker.address);
  });

  it("should reject non-owner permanent revocation", async function () {
  await manager.mintStudentToken(student1.address);

  await expect(
    manager.connect(attacker).revokePermanently(student1.address)
  )
    .to.be.revertedWithCustomError(manager, "OwnableUnauthorizedAccount")
    .withArgs(attacker.address);
  });

  it("should reject non-owner wallet replacement", async function () {
  await manager.mintStudentToken(student1.address);

  await expect(
    manager.connect(attacker).replaceStudentWallet(student1.address, student2.address)
  )
    .to.be.revertedWithCustomError(manager, "OwnableUnauthorizedAccount")
    .withArgs(attacker.address);
  });

});