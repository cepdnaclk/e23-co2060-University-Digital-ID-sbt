Smart Contract Deployment Documentation
Project: University Digital Student ID System Using Soulbound Tokens

====================================================================
1. Introduction
====================================================================

The blockchain layer of this project consists of two smart contracts deployed on the Ethereum Sepolia Test Network.

PeraSoul implements the Soulbound Token (SBT), while PeraSoulManager provides the administrative functionality required to manage digital student identities. After deployment, ownership of the PeraSoul contract is transferred to PeraSoulManager so that all administrative operations are securely controlled through a single management contract.

Deployment was performed using Hardhat, MetaMask, Alchemy RPC, and the Ethereum Sepolia Test Network.

====================================================================
2. Deployment Environment
====================================================================

Blockchain Network : Ethereum Sepolia Test Network
Framework          : Hardhat 3
Programming Language : Solidity
Wallet             : MetaMask
RPC Provider       : Alchemy

====================================================================
3. Deployment Procedure
====================================================================

Step 1
Compile the smart contracts.

Command:
npx hardhat compile

Step 2
Deploy the contracts.

Command:
npx hardhat run scripts/deploy-sepolia.js --network sepolia

During deployment the following actions are executed:

- Deploy PeraSoul contract
- Deploy PeraSoulManager contract
- Transfer ownership of PeraSoul to PeraSoulManager
- Save deployment information for backend integration

====================================================================
4. Deployment Information
====================================================================

Deployment Date 2026/07/05

________________________________________________________

Deployer Wallet Address: 0x74289cEC373F992C7f5fFEaC08656a7ee11eCb95

________________________________________________________

====================================================================
5. Smart Contract Addresses
====================================================================

PeraSoul Contract Address: 0xB2E3d251ebdAfcFA53FE1e3459C378d6ae6D815a

________________________________________________________

Etherscan Link: https://sepolia.etherscan.io/address/0xB2E3d251ebdAfcFA53FE1e3459C378d6ae6D815a

________________________________________________________

------------------------------------------------------------

PeraSoulManager Contract Address: 0xef6fbd44ade664a2eF9739011cF51219Ac97f212

________________________________________________________

Etherscan Link: https://sepolia.etherscan.io/address/0xef6fbd44ade664a2eF9739011cF51219Ac97f212

________________________________________________________


====================================================================
7. Deployment Result
====================================================================

The deployment successfully published both smart contracts to the Ethereum Sepolia Test Network.

The deployed system now supports:

- Soulbound Token issuance
- Student identity verification
- Temporary revocation
- Permanent revocation
- Student wallet replacement
- Event logging
- Administrative ownership management

These deployed contracts are now ready to be integrated with the backend.