import { expect } from "chai";
import hre from "hardhat";

describe("PeraSoul System", function () {
  let ethers;
  let peraSoul;
  let manager;
  let owner;
  let student1;
  let student2;
  let attacker;

  beforeEach(async function () {
    const connection = await hre.network.connect();
    ethers = connection.ethers;

    [owner, student1, student2, attacker] = await ethers.getSigners();

    const PeraSoul = await ethers.getContractFactory("PeraSoul");
    peraSoul = await PeraSoul.deploy();

    const PeraSoulManager = await ethers.getContractFactory("PeraSoulManager");
    manager = await PeraSoulManager.deploy(await peraSoul.getAddress());

    await peraSoul.transferOwnership(await manager.getAddress());
  });

  it("should deploy both contracts correctly", async function () {
    expect(await peraSoul.name()).to.equal("PeraSoul");
    expect(await peraSoul.symbol()).to.equal("PERA");
    expect(await peraSoul.owner()).to.equal(await manager.getAddress());
  });

  it("should mint student token through manager", async function () {
    await manager.mintStudentToken(student1.address);

    expect(await peraSoul.hasToken(student1.address)).to.equal(true);
    expect(await peraSoul.studentToken(student1.address)).to.equal(1n);
    expect(await manager.verifyStudent(student1.address)).to.equal(true);
  });

  it("should prevent duplicate token minting", async function () {
    await manager.mintStudentToken(student1.address);

    await expect(
      manager.mintStudentToken(student1.address)
    ).to.be.revertedWith("Student Already Has SBT");
  });

  it("should prevent non-owner from minting", async function () {
    await expect(
      manager.connect(attacker).mintStudentToken(student1.address)
    ).to.be.revertedWithCustomError(manager, "OwnableUnauthorizedAccount");
  });

  it("should temporarily revoke token", async function () {
    await manager.mintStudentToken(student1.address);

    await manager.revokeTemporarily(student1.address, 3600);

    expect(await manager.verifyStudent(student1.address)).to.equal(false);

    const remaining = await manager.getRemainingRevocationTime(student1.address);
    expect(remaining).to.be.greaterThan(0n);
  });

  it("should make token valid again after temporary revoke time ends", async function () {
    await manager.mintStudentToken(student1.address);

    await manager.revokeTemporarily(student1.address, 3600);

    await ethers.provider.send("evm_increaseTime", [3601]);
    await ethers.provider.send("evm_mine", []);

    expect(await manager.verifyStudent(student1.address)).to.equal(true);
  });

  it("should permanently revoke and burn token", async function () {
    await manager.mintStudentToken(student1.address);

    await manager.revokePermanently(student1.address);

    expect(await peraSoul.hasToken(student1.address)).to.equal(false);
    expect(await manager.verifyStudent(student1.address)).to.equal(false);
  });

  it("should replace student wallet", async function () {
    await manager.mintStudentToken(student1.address);

    await manager.replaceStudentWallet(student1.address, student2.address);

    expect(await peraSoul.hasToken(student1.address)).to.equal(false);
    expect(await peraSoul.hasToken(student2.address)).to.equal(true);
    expect(await manager.verifyStudent(student2.address)).to.equal(true);
  });

  it("should prevent token transfer", async function () {
    await manager.mintStudentToken(student1.address);

    await expect(
      peraSoul
        .connect(student1)
        .transferFrom(student1.address, student2.address, 1)
    ).to.be.revertedWith("SoulBound: transfer is denied");
  });
});