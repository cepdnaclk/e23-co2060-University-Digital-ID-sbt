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

  it("should reject temporary revocation for student without token", async function () {
  await expect(
    manager.revokeTemporarily(student1.address, 10)
  ).to.be.revertedWith("Student has no token");
  });

  it("should reject permanent revocation for student without token", async function () {
  await expect(
    manager.revokePermanently(student1.address)
  ).to.be.revertedWith("Student has no token");
  });

  it("should reject temporary revocation with zero duration", async function () {
  await manager.mintStudentToken(student1.address);

  await expect(
    manager.revokeTemporarily(student1.address, 0)
  ).to.be.revertedWith("Invalid duration");
  });

  it("should reject remaining revocation time check for student without token", async function () {
  await expect(
    manager.getRemainingRevocationTime(student1.address)
  ).to.be.revertedWith("Student has no token");
  });

});