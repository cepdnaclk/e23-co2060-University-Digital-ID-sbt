Smart Contract Testing Documentation
Project: PeraSoul (Digital University ID System Using Soulbound Tokens)
Author: M.V.R. Dayananda (E/23/054)
Department of Computer Engineering, University of Peradeniya

1. Introduction

This document describes the smart contract testing process carried out for the Digital Student ID Using Soulbound Tokens project. The project uses blockchain technology to issue non-transferable digital student identities as Soulbound Tokens. The smart contract system consists of two main contracts: PeraSoul and PeraSoulManager.

PeraSoul is responsible for issuing and burning Soulbound Tokens, storing token ownership information, and preventing token transfers. PeraSoulManager is responsible for higher-level administration functions such as student verification, temporary revocation, permanent revocation, and wallet replacement.

The purpose of testing was to ensure that the smart contracts behave correctly before deploying them to a public blockchain test network such as Sepolia.

2. Testing Environment

The smart contracts were tested using the Hardhat development environment. Hardhat was used to compile the contracts, run automated test cases, and simulate blockchain behavior locally.

Tools and technologies used:
- Solidity
- Hardhat
- JavaScript test scripts
- Mocha testing framework
- Chai assertion library
- OpenZeppelin smart contract library
- Local Hardhat blockchain

3. Contracts Tested

The following contracts were tested:

1. PeraSoul.sol
   - Implements ERC-721 based Soulbound Token logic.
   - Allows token minting by the contract owner.
   - Allows token burning by the contract owner.
   - Prevents token transfers.
   - Stores whether a student already owns a token.

2. PeraSoulManager.sol
   - Manages student token issuance.
   - Handles temporary token revocation.
   - Handles permanent token revocation.
   - Verifies whether a student has a valid token.
   - Supports wallet replacement for lost or changed wallets.

4. Main Testing Objectives

The main objectives of testing were:
- To verify that contracts compile successfully.
- To confirm that only authorized users can perform admin operations.
- To ensure each student can receive only one Soulbound Token.
- To confirm that Soulbound Tokens cannot be transferred.
- To verify temporary revocation functionality.
- To verify permanent revocation functionality.
- To check wallet replacement functionality.
- To confirm that contract state remains consistent after each operation.
- To check that important events are emitted correctly.

5. Test Categories and Results

5.1 Compilation Test

Objective:
To ensure that the smart contracts are syntactically correct and compatible with the Solidity compiler and OpenZeppelin libraries.

Command used:
npx hardhat compile

Result:
The contracts compiled successfully without Solidity syntax errors.

Outcome:
The contracts are ready for testing and deployment.

5.2 Ownership Test

Objective:
To verify the ownership structure between PeraSoul and PeraSoulManager.

Test performed:
- Deploy PeraSoul.
- Deploy PeraSoulManager with the PeraSoul contract address.
- Transfer ownership of PeraSoul to PeraSoulManager.
- Check that PeraSoulManager becomes the owner of PeraSoul.
- Check that the deployer/admin remains the owner of PeraSoulManager.

Expected result:
- PeraSoul owner should be PeraSoulManager.
- PeraSoulManager owner should be the admin wallet.

Actual result:
The ownership test passed successfully.

5.3 Token Minting Test

Objective:
To verify that the admin can issue a Soulbound Token to a student wallet.

Test performed:
- Admin calls mintStudentToken().
- The token is minted to the student wallet.
- hasToken(student) becomes true.
- studentToken(student) stores the correct token ID.
- verifyStudent(student) returns true.

Expected result:
The student receives a valid token.

Actual result:
The minting test passed successfully.

5.4 Duplicate Token Prevention Test

Objective:
To ensure that one student wallet cannot receive multiple Soulbound Tokens.

Test performed:
- Mint one token to a student wallet.
- Try to mint another token to the same wallet.

Expected result:
The second minting attempt should fail with an error such as "Student Already Has SBT".

Actual result:
The duplicate minting test passed successfully.

5.5 Non-Owner Access Control Tests

Objective:
To verify that unauthorized users cannot perform admin-only operations.

Test performed:
- A non-owner account tries to mint a token.
- A non-owner account tries to temporarily revoke a token.
- A non-owner account tries to permanently revoke a token.
- A non-owner account tries to replace a student wallet.

Expected result:
All non-owner operations should fail.

Actual result:
All non-owner access control tests passed successfully.

5.6 Temporary Revocation Test

Objective:
To verify that a student's token can be temporarily revoked for a defined period.

Test performed:
- Mint a token to a student wallet.
- Temporarily revoke the token for a short time.
- Immediately verify the student.
- Increase blockchain time beyond the revocation period.
- Verify the student again.

Expected result:
- Verification should return false during the revocation period.
- Verification should return true after the revocation period expires.

Actual result:
The temporary revocation test passed successfully.

5.7 Permanent Revocation Test

Objective:
To verify that a token can be permanently revoked and burned.

Test performed:
- Mint a token to a student wallet.
- Permanently revoke the student token.
- Check whether the token is burned.
- Check whether hasToken(student) becomes false.
- Check whether verifyStudent(student) returns false.

Expected result:
The token should be burned and the student should no longer be valid.

Actual result:
The permanent revocation test passed successfully.

5.8 Wallet Replacement Test

Objective:
To verify that a student's wallet can be replaced if the original wallet is lost or compromised.

Test performed:
- Mint a token to the old wallet.
- Replace the old wallet with a new wallet.
- Burn the token from the old wallet.
- Mint a new token to the new wallet.
- Verify both wallets.

Expected result:
- Old wallet should no longer have a token.
- New wallet should have a valid token.
- Old wallet verification should return false.
- New wallet verification should return true.

Actual result:
The wallet replacement test passed successfully.

5.9 Soulbound Transfer Blocking Tests

Objective:
To confirm that tokens are non-transferable.

Test performed:
- Mint a token to a student wallet.
- Try to transfer the token using transferFrom().
- Try to transfer the token using safeTransferFrom() without data.
- Try to transfer the token using safeTransferFrom() with data.

Expected result:
All transfer attempts should fail with the message "SoulBound: transfer is denied".

Actual result:
All transfer blocking tests passed successfully.

5.10 Zero Address Tests

Objective:
To ensure that invalid zero addresses are rejected.

Test performed:
- Try to mint a token to address(0).
- Try to replace a wallet using address(0) as the old wallet.
- Try to replace a wallet using address(0) as the new wallet.

Expected result:
All zero address operations should fail.

Actual result:
All zero address tests passed successfully.

5.11 Event Emission Tests

Objective:
To verify that important contract events are emitted correctly.

Events tested:
- StudentTokenMinted
- TokenTemporarilyRevoked
- TokenPermanentlyRevoked
- StudentWalletReplaced
- TokenIssued
- TokenBurned

Expected result:
Relevant events should be emitted after each important operation.

Actual result:
Event emission tests passed successfully.

5.12 State Consistency Tests

Objective:
To ensure that mappings and contract state remain correct after token operations.

Test performed:
- Check token state after permanent revocation.
- Check old and new wallet state after wallet replacement.
- Check that a new token ID is issued after wallet replacement.

Expected result:
- Burned wallets should not have active tokens.
- Replaced wallets should be invalid.
- New wallets should be valid.
- Token IDs should remain unique.

Actual result:
State consistency tests passed successfully.

6. Local Blockchain Deployment Testing

After unit testing, the contracts were deployed to a local Hardhat blockchain. This helped verify that the contracts work correctly in a blockchain-like environment.

Steps performed:
1. Start local blockchain:
   npx hardhat node

2. Deploy contracts locally:
   npx hardhat run scripts/deploy-local.js --network localhost

3. Run interaction script:
   npx hardhat run scripts/interact-local.js --network localhost

Functions tested on local blockchain:
- Token minting
- Student verification
- Temporary revocation
- Verification after revocation expiry
- Permanent revocation
- Token reissuing
- Wallet replacement

Result:
The local blockchain interaction test completed successfully.

7. Overall Testing Result

All designed tests were completed successfully. No issues were found in the final test execution.

The smart contract system successfully demonstrated:
- Secure token issuance
- Non-transferability of student identity tokens
- Admin-only control
- Temporary revocation
- Permanent revocation
- Wallet replacement
- Correct verification behavior
- Proper state management
- Correct event emission

8. Developer Guide: How to Properly Test Smart Contracts

8.1 Step 1: Compile the Smart Contracts

Before testing, compile the smart contracts.

Command:
npx hardhat compile

Purpose:
This checks whether the Solidity code contains syntax errors or dependency issues.

Expected result:
Contracts should compile successfully.

8.2 Step 2: Write Unit Tests

Unit tests should be written to test each function independently.

Important areas to test:
- Deployment
- Minting
- Revocation
- Verification
- Access control
- Transfer restrictions
- Invalid input handling
- Event emissions

8.3 Step 3: Test Access Control

Admin-only functions must be tested using both owner and non-owner accounts.

Example:
- Owner should be able to mint.
- Non-owner should not be able to mint.

This prevents unauthorized users from controlling the identity system.

8.4 Step 4: Test State Changes

For each function that changes blockchain state, check the state before and after execution.

Example:
After minting:
- hasToken(student) should be true.
- studentToken(student) should contain a valid token ID.

After burning:
- hasToken(student) should be false.
- studentToken(student) should be zero or deleted.

8.5 Step 5: Test Reverts

A good smart contract test should check not only successful cases but also failure cases.

Examples:
- Minting to zero address should fail.
- Duplicate minting should fail.
- Replacing wallet with the same wallet should fail.
- Non-owner revocation should fail.

8.6 Step 6: Test Events

Events are important because they help track blockchain activity. Test whether events are emitted after major operations.

Examples:
- TokenIssued after minting.
- TokenBurned after burning.
- TokenPermanentlyRevoked after permanent revocation.

8.7 Step 7: Test Edge Cases

Edge cases help identify hidden bugs.

Examples:
- Student without token tries to be revoked.
- New wallet already has a token.
- Revocation duration is zero.
- Student tries to transfer a Soulbound Token.

8.8 Step 8: Test on a Local Blockchain

After unit testing, deploy the contracts to a local blockchain.

Commands:
npx hardhat node
npx hardhat run scripts/deploy-local.js --network localhost
npx hardhat run scripts/interact-local.js --network localhost

Purpose:
This simulates a real blockchain environment before public testnet deployment.

8.9 Step 9: Estimate Gas Usage

Gas estimation helps understand the cost of smart contract operations.

Important operations to measure:
- Contract deployment
- Token minting
- Temporary revocation
- Permanent revocation
- Wallet replacement

8.10 Step 10: Deploy to a Public Testnet

Only after local testing passes, deploy to a public testnet such as Sepolia.

Before deployment:
- Check RPC URL.
- Check private key.
- Check wallet has enough test ETH.
- Check deployment script.
- Confirm contract ownership transfer.

9. Recommended Smart Contract Testing Checklist

Before deploying to a testnet, confirm the following:

[ ] Contracts compile successfully.
[ ] Deployment works locally.
[ ] Owner can mint tokens.
[ ] Non-owner cannot mint tokens.
[ ] Duplicate minting is prevented.
[ ] Zero address inputs are rejected.
[ ] Temporary revocation works.
[ ] Temporary revocation expires correctly.
[ ] Permanent revocation burns tokens.
[ ] Wallet replacement works.
[ ] Old wallet becomes invalid after replacement.
[ ] New wallet becomes valid after replacement.
[ ] transferFrom is blocked.
[ ] safeTransferFrom is blocked.
[ ] Events are emitted correctly.
[ ] Contract state remains consistent.
[ ] Gas estimation is completed.
[ ] Testnet deployment is attempted only after all local tests pass.

10. Conclusion

The smart contract testing phase was completed successfully. The tests confirmed that the core blockchain layer of the Digital Student ID Using Soulbound Tokens project works as expected. The system can issue non-transferable student identity tokens, verify token validity, temporarily revoke tokens, permanently revoke tokens, and support wallet replacement. These results indicate that the smart contracts are ready for testnet deployment and integration with the backend and frontend layers.
