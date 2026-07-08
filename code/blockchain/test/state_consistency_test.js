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

  it("should clear token state after permanent revoke", async function () {
  await manager.mintStudentToken(student1.address);

  await manager.revokePermanently(student1.address);

  expect(await peraSoul.hasToken(student1.address)).to.equal(false);
  expect(await peraSoul.studentToken(student1.address)).to.equal(0n);
  expect(await manager.verifyStudent(student1.address)).to.equal(false);
  });

  it("should keep old wallet invalid and new wallet valid after replacement", async function () {
  await manager.mintStudentToken(student1.address);

  await manager.replaceStudentWallet(student1.address, student2.address);

  expect(await peraSoul.hasToken(student1.address)).to.equal(false);
  expect(await peraSoul.studentToken(student1.address)).to.equal(0n);
  expect(await manager.verifyStudent(student1.address)).to.equal(false);

  expect(await peraSoul.hasToken(student2.address)).to.equal(true);
  expect(await manager.verifyStudent(student2.address)).to.equal(true);
  });

  it("should generate new token ID after wallet replacement", async function () {
  await manager.mintStudentToken(student1.address);

  const oldTokenId = await peraSoul.studentToken(student1.address);

  await manager.replaceStudentWallet(student1.address, student2.address);

  const newTokenId = await peraSoul.studentToken(student2.address);

  expect(oldTokenId).to.equal(1n);
  expect(newTokenId).to.equal(2n);
  });

});