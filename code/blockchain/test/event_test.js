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

  it("should emit StudentTokenMinted event", async function () {
  await expect(manager.mintStudentToken(student1.address))
    .to.emit(manager, "StudentTokenMinted")
    .withArgs(student1.address, 1n);
  });

  it("should emit temporary revocation event", async function () {
  await manager.mintStudentToken(student1.address);

  await expect(manager.revokeTemporarily(student1.address, 10))
    .to.emit(manager, "TokenTemporarilyRevoked");
  });

  it("should emit permanent revocation event", async function () {
  await manager.mintStudentToken(student1.address);

  await expect(manager.revokePermanently(student1.address))
    .to.emit(manager, "TokenPermanentlyRevoked")
    .withArgs(1n);
  });

  it("should emit wallet replacement event", async function () {
  await manager.mintStudentToken(student1.address);

  await expect(manager.replaceStudentWallet(student1.address, student2.address))
    .to.emit(manager, "StudentWalletReplaced");
  });

});