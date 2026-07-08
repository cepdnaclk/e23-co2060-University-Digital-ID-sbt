import hre from "hardhat";

async function main() {
    const { ethers } = await hre.network.connect();

    const [owner, student1, student2] = await ethers.getSigners();

    console.log("Deploying contracts...\n");

    const PeraSoul = await ethers.getContractFactory("PeraSoul");
    const peraSoul = await PeraSoul.deploy();
    await peraSoul.waitForDeployment();

    const PeraSoulManager = await ethers.getContractFactory("PeraSoulManager");
    const manager = await PeraSoulManager.deploy(await peraSoul.getAddress());
    await manager.waitForDeployment();

    await (await peraSoul.transferOwnership(await manager.getAddress())).wait();

    console.log("Contracts deployed.\n");

    //----------------------------
    // Mint
    //----------------------------

    let tx = await manager.mintStudentToken(student1.address);
    let receipt = await tx.wait();

    console.log("Mint Student Token");
    console.log("Gas Used:", receipt.gasUsed.toString());

    //----------------------------
    // Temporary Revoke
    //----------------------------

    tx = await manager.revokeTemporarily(student1.address, 30);
    receipt = await tx.wait();

    console.log("\nTemporary Revoke");
    console.log("Gas Used:", receipt.gasUsed.toString());

    //----------------------------
    // Permanent Revoke
    //----------------------------

    tx = await manager.revokePermanently(student1.address);
    receipt = await tx.wait();

    console.log("\nPermanent Revoke");
    console.log("Gas Used:", receipt.gasUsed.toString());

    //----------------------------
    // Mint Again
    //----------------------------

    tx = await manager.mintStudentToken(student1.address);
    receipt = await tx.wait();

    console.log("\nMint Again");
    console.log("Gas Used:", receipt.gasUsed.toString());

    //----------------------------
    // Wallet Replacement
    //----------------------------

    tx = await manager.replaceStudentWallet(
        student1.address,
        student2.address
    );

    receipt = await tx.wait();

    console.log("\nWallet Replacement");
    console.log("Gas Used:", receipt.gasUsed.toString());

    console.log("\nGas estimation completed.");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});