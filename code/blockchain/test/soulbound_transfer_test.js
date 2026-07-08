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

    it("should reject transferFrom", async function () {
  await manager.mintStudentToken(student1.address);

  await expect(
    peraSoul.connect(student1).transferFrom(student1.address, student2.address, 1)
  ).to.be.revertedWith("SoulBound: transfer is denied");
  });

  it("should reject safeTransferFrom without data", async function () {
  await manager.mintStudentToken(student1.address);

  await expect(
    peraSoul
      .connect(student1)
      ["safeTransferFrom(address,address,uint256)"](
        student1.address,
        student2.address,
        1
      )
  ).to.be.revertedWith("SoulBound: transfer is denied");
  });

  it("should reject safeTransferFrom with data", async function () {
  await manager.mintStudentToken(student1.address);

  await expect(
    peraSoul
      .connect(student1)
      ["safeTransferFrom(address,address,uint256,bytes)"](
        student1.address,
        student2.address,
        1,
        "0x"
      )
  ).to.be.revertedWith("SoulBound: transfer is denied");
  });

});