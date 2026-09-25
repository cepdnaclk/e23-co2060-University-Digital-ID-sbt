---
layout: home
permalink: index.html

repository-name: e23-co2060-University-Digital-ID-sbt
title: Blockchain-Based Digital University Student ID System Using Soulbound Tokens
---

# PeraSoul

## Blockchain-Based Digital University Student ID System Using Soulbound Tokens

**CO2060 - Software Systems Design Project**

Department of Computer Engineering  
Faculty of Engineering  
University of Peradeniya  

---

## Team

- **E/23/054 - M.V.R. Dayananda**  
  [e23054@eng.pdn.ac.lk](mailto:e23054@eng.pdn.ac.lk)

### Supervisor

- **Dr. Chathura Vithanage**  
  Department of Computer Engineering  
  University of Peradeniya  
  [chathuraw@eng.pdn.ac.lk](mailto:chathuraw@eng.pdn.ac.lk)

---

![PeraSoul Project Cover](./data/cover_page.jpg)

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Problem Statement](#2-problem-statement)
3. [Proposed Solution](#3-proposed-solution)
4. [System Users](#4-system-users)
5. [Solution Architecture](#5-solution-architecture)
6. [System Design](#6-system-design)
7. [Core Workflows](#7-core-workflows)
8. [Smart Contract Design](#8-smart-contract-design)
9. [Backend and API Design](#9-backend-and-api-design)
10. [Database Design](#10-database-design)
11. [Authentication and Security](#11-authentication-and-security)
12. [QR-Based Public Verification](#12-qr-based-public-verification)
13. [Testing and Validation](#13-testing-and-validation)
14. [Final System Features](#14-final-system-features)
15. [Limitations](#15-limitations)
16. [Future Development](#16-future-development)
17. [Conclusion](#17-conclusion)
18. [Links](#18-links)

---

# 1. Introduction

## 1.1 Background

Universities traditionally use physical student identity cards together with centralized databases to identify students and provide access to institutional services.

Although physical identity cards are simple to use, they have several limitations. Cards can be lost, damaged, copied, altered, or shared with another person. A physical card may also continue to appear valid even when the student's actual university status has changed.

Centralized digital identity systems improve convenience, but they still depend heavily on a central database and authentication infrastructure.

**PeraSoul** investigates how blockchain technology and **Soulbound Tokens (SBTs)** can be used to create a secure, verifiable and non-transferable Digital Student ID while still allowing the university to control student information and identity administration.

---

## 1.2 Project Overview

PeraSoul is a blockchain-based Digital University Student ID System.

Each approved student can receive a non-transferable ERC-721-based digital identity token associated with their registered Ethereum wallet.

The system combines:

- HTML, CSS and JavaScript frontend
- Python FastAPI backend
- SQLAlchemy ORM
- SQLite relational database
- MetaMask wallet authentication
- Solidity smart contracts
- Web3.py blockchain integration
- Ethereum Sepolia test network
- Soulbound Token-based Digital Student IDs
- Role-based administrator access
- Public identity verification
- Short-lived live QR verification

PeraSoul follows a **hybrid architecture**.

Personal and academic student information remains in the university-controlled application database, while the blockchain stores only the token ownership and validity information required to verify the Digital Student ID.

---

# 2. Problem Statement

Traditional university student identity systems contain several limitations.

## 2.1 Physical Identity Card Problems

- Student cards can be lost or damaged.
- Cards may be copied, forged or altered.
- A stolen card may be used by another person.
- Verification often depends only on visual inspection.
- A physical card may still appear valid after a student's status changes.
- Lost-card replacement requires administrative processing.

## 2.2 Centralized Digital Identity Problems

- The central database becomes a single point of trust.
- Unauthorized changes may affect identity records.
- Different university divisions may maintain separate records.
- External verification generally depends completely on university-controlled systems.

## 2.3 Transferable Digital Token Problem

Ordinary ERC-721 NFTs are transferable.

A university student identity should not be sold, exchanged or transferred to another person. Therefore, an ordinary NFT is not sufficient for representing a personal university identity.

## 2.4 Wallet Ownership Problem

A blockchain wallet address is public information.

Simply entering a wallet address does not prove that a user owns the wallet. The system must therefore use a cryptographic signature to prove wallet ownership without requesting the user's private key.

---

# 3. Proposed Solution

PeraSoul provides a university-controlled Digital Student ID represented by a **Soulbound Token**.

The overall process is:

1. A student registers through the web application.
2. The student connects a MetaMask wallet.
3. The registration is stored with a **Pending** account status.
4. A University Administrator reviews the student registration.
5. The administrator approves the student.
6. The student authenticates using a MetaMask signature.
7. The student requests a Digital Student ID.
8. A University Administrator reviews the request.
9. The backend submits a token-minting transaction to Ethereum Sepolia.
10. A non-transferable Digital Student ID token is issued.
11. The student can view the Digital Student ID and live QR verification page.
12. A public verifier can check the current validity of the identity.

The university can additionally:

- Temporarily revoke an identity
- Automatically restore validity after temporary revocation expires
- Permanently revoke an identity
- Replace a lost or compromised student wallet
- Manage multiple University Administrator accounts
- Maintain blockchain transaction and audit records

---

# 4. System Users

PeraSoul contains four main user roles.

## 4.1 Student

A student can:

- Register a student profile
- Connect a MetaMask wallet
- Authenticate using a wallet signature
- View account status
- View student profile information
- Request a Digital Student ID
- View token status
- View blockchain validity
- Access the Digital Student ID
- Generate live QR verification codes
- View wallet replacement information
- Access public verification

Students cannot approve their own accounts, mint their own tokens, or perform administrative blockchain operations.

---

## 4.2 University Administrator

A University Administrator handles normal student identity operations.

The role can:

- Authenticate using an authorized MetaMask wallet
- Review pending student registrations
- Approve students
- Review pending token requests
- Mint Digital Student IDs
- View issued identities
- Temporarily revoke identities
- Permanently revoke identities
- Replace student wallets
- View identity-management statistics
- Monitor blockchain operations

---

## 4.3 Technical Administrator

The Technical Administrator is responsible for application-level administrator access management.

The role can:

- Authenticate using MetaMask
- Create University Administrator accounts
- Register University Administrator wallet addresses
- Activate administrator accounts
- Disable administrator accounts
- Change registered administrator wallets
- Monitor administrator access configuration

The Technical Administrator does not normally approve students or mint/revoke student identities.

---

## 4.4 Public Verifier

A Public Verifier does not require an authenticated PeraSoul account.

Possible verifiers include:

- University security officers
- Lecturers
- Examination supervisors
- Library staff
- Event organizers
- Employers

The verifier can check the current Digital Student ID validity using:

- Token ID verification
- Live QR verification

---

# 5. Solution Architecture

PeraSoul uses a **four-layer architecture**.

| Layer | Main Components | Responsibility |
|---|---|---|
| Presentation Layer | Student Portal, Technical Administrator Portal, University Administrator Portal, Public Verification, MetaMask | Provides user interfaces and wallet interaction |
| Application Layer | Python, FastAPI, Pydantic, Authentication, Authorization, Business Logic, Web3.py | Processes requests, validates data and coordinates database/blockchain operations |
| Data Layer | SQLAlchemy, SQLite | Stores users, profiles, requests, token records, logs and application data |
| Blockchain Layer | PeraSoul, PeraSoulManager, Ethereum Sepolia | Maintains token ownership, non-transferability, verification and revocation state |

---

## 5.1 Presentation Layer

The presentation layer is implemented using:

- HTML5
- CSS3
- Vanilla JavaScript

It contains interfaces for:

- Public landing page
- Student registration
- Student login
- Student dashboard
- Digital Student ID
- QR verification
- Administrator login
- Technical Administrator dashboard
- University Administrator dashboard
- Public verification

The frontend communicates with MetaMask through `window.ethereum` and communicates with FastAPI using the Fetch API.

---

## 5.2 Application Layer

The application layer is implemented using:

- Python
- FastAPI
- Pydantic
- Web3.py
- Python-Jose

Major responsibilities include:

- Request validation
- Student registration
- Authentication
- Authorization
- Role enforcement
- Token request processing
- Blockchain transaction management
- Transaction receipt validation
- Revocation management
- Wallet replacement
- QR session generation
- Public verification
- Logging and auditing

---

## 5.3 Data Layer

The relational data layer is implemented using:

- SQLAlchemy
- SQLite

SQLite is used for the current academic prototype.

The architecture can later be migrated to PostgreSQL or another production-grade database without changing the overall application design.

---

## 5.4 Blockchain Layer

The blockchain layer uses:

- Solidity
- OpenZeppelin Contracts
- ERC-721
- Hardhat
- Web3.py
- Ethereum Sepolia

The two main smart contracts are:

- **PeraSoul**
- **PeraSoulManager**

---

# 6. System Design

## 6.1 Hybrid Data Storage

PeraSoul deliberately separates student personal data from public blockchain state.

### Information Stored in the Application Database

- Student name
- Student registration number
- Faculty
- Department
- Batch
- Academic year
- University email
- Phone number
- Wallet address
- User role
- Account status
- Token requests
- Token records
- Transaction logs
- Revocation logs
- Audit logs

### Information Managed Through Blockchain

- Token ownership
- Wallet-to-token relationship
- Identity validity
- Temporary revocation state
- Permanent revocation state
- Non-transferability
- Wallet replacement-related identity state

Personal student profile data is therefore not stored directly on the public Ethereum blockchain.

---

## 6.2 Technology Stack

| Component | Technology |
|---|---|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Backend | Python, FastAPI |
| Validation | Pydantic |
| ORM | SQLAlchemy |
| Database | SQLite |
| Blockchain Client | Web3.py |
| Wallet | MetaMask |
| Smart Contracts | Solidity |
| Contract Library | OpenZeppelin |
| Contract Tooling | Hardhat |
| Blockchain Network | Ethereum Sepolia |
| Authentication | MetaMask signatures and JWT |
| Version Control | Git and GitHub |
| Backend Testing | pytest, pytest-cov, pytest-html |
| Smart Contract Testing | Hardhat and Mocha |

---

# 7. Core Workflows

## 7.1 Student Registration

The student registration process is:

**Student Registration → MetaMask Wallet Connection → Backend Validation → User Creation → Student Profile Creation → Pending Account**

A newly registered student receives the **Pending** account status.

The student must be approved by a University Administrator before requesting a Digital Student ID.

---

## 7.2 Student Approval

The University Administrator reviews the pending registration.

**Pending Student → Administrator Review → Approve Student → Account Status Active**

Only an active student can submit a Digital Student ID request.

---

## 7.3 Student Authentication

Student authentication uses a nonce-signature workflow.

1. The student selects the registered MetaMask wallet.
2. The frontend requests a login challenge from the backend.
3. The backend generates a unique one-time nonce.
4. MetaMask asks the student to sign the login message.
5. The signed message is sent to the backend.
6. The backend recovers the wallet address from the signature.
7. The recovered address is compared with the registered wallet.
8. Login succeeds only when the addresses match.
9. The login nonce is invalidated after successful authentication.

The private key never leaves MetaMask.

---

## 7.4 Digital Student ID Request

Only an active student can request a Digital Student ID.

The workflow is:

**Active Student → Digital Student ID Request → Pending Token Request → University Administrator Review**

The backend prevents:

- Duplicate pending requests
- Requests from pending/inactive users
- Multiple identities for the same wallet
- Requests when a valid identity already exists

---

## 7.5 Token Minting

After the University Administrator approves the request:

**Administrator Approval → FastAPI → Web3.py → PeraSoulManager → PeraSoul → Ethereum Sepolia → Transaction Receipt → Database Update**

The database is updated only after the blockchain transaction is successfully confirmed.

After successful minting:

- Token request status becomes Minted
- StudentToken record is created
- Blockchain transaction is logged
- Digital Student ID becomes active

---

## 7.6 Temporary Revocation

A University Administrator can temporarily revoke a student identity.

The administrator specifies:

- Student wallet
- Months
- Days
- Hours
- Minutes
- Reason

The backend converts the duration into seconds.

While the revocation period is active:

**Current Identity Validity = Not Valid**

After the blockchain expiration timestamp is reached:

**Current Identity Validity = Valid**

The restoration happens automatically without requiring another blockchain transaction.

---

## 7.7 Permanent Revocation

Permanent revocation is used when an identity should no longer be accepted.

After permanent revocation:

- Blockchain verification returns invalid
- The identity does not automatically recover
- Database revocation and transaction records are updated

---

## 7.8 Wallet Replacement

Wallet replacement is used when a student loses access to the registered wallet or when the university performs a controlled identity migration.

The workflow is:

**Old Wallet → Student Verification → New Wallet → University Administrator Approval → Blockchain Replacement → Database Update**

The old identity relationship becomes invalid and the new wallet becomes associated with the replacement identity.

Only public wallet addresses are required. Private keys and Secret Recovery Phrases are never requested.

---

# 8. Smart Contract Design

## 8.1 PeraSoul Contract

`PeraSoul` represents the Digital Student ID token.

It is based on ERC-721 but restricts normal token transfers so that the identity becomes non-transferable.

Main responsibilities include:

- Token creation
- Token ownership
- Wallet-to-token mapping
- One-token-per-wallet enforcement
- Transfer restriction

---

## 8.2 PeraSoulManager Contract

`PeraSoulManager` provides higher-level identity-management operations.

Main responsibilities include:

- Token issuance
- Identity verification
- Temporary revocation
- Permanent revocation
- Wallet replacement

The backend communicates with this contract through Web3.py.

---

## 8.3 Soulbound Behaviour

A standard ERC-721 NFT can normally be transferred between wallets.

PeraSoul prevents ordinary transfers so the Digital Student ID cannot normally be:

- Sold
- Exchanged
- Sent to another student
- Transferred to another wallet by the student

This preserves the relationship between the approved identity and the registered wallet.

---

# 9. Backend and API Design

The backend is implemented using FastAPI REST APIs.

## 9.1 Student Authentication APIs

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/auth/register` | Register a new student |
| POST | `/auth/nonce` | Generate student login challenge |
| POST | `/auth/verify-signature` | Verify MetaMask signature |

---

## 9.2 Student APIs

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/student/dashboard/{wallet}` | Retrieve student dashboard state |
| POST | `/student/request-token` | Submit Digital Student ID request |

---

## 9.3 Administrator Authentication APIs

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/admin-auth/nonce` | Generate administrator login challenge |
| POST | `/admin-auth/verify-signature` | Verify administrator wallet signature |
| GET | `/admin-auth/me` | Retrieve authenticated administrator session |

---

## 9.4 Technical Administrator APIs

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/technical-admin/admins` | List University Administrators |
| POST | `/technical-admin/admins` | Create a University Administrator |
| GET | `/technical-admin/admins/{admin_id}` | Retrieve administrator information |
| PATCH | `/technical-admin/admins/{admin_id}/status` | Activate or disable administrator |
| PATCH | `/technical-admin/admins/{admin_id}/wallet` | Change administrator wallet |

---

## 9.5 University Administrator APIs

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/admin/dashboard` | Retrieve administrator dashboard data |
| GET | `/admin/pending-students` | List pending students |
| POST | `/admin/approve-student/{user_id}` | Approve student |
| GET | `/admin/token-requests` | List pending token requests |
| POST | `/admin/approve-request/{request_id}` | Approve request and mint token |
| POST | `/admin/temporary-revoke` | Temporarily revoke identity |
| GET | `/admin/active-tokens` | Retrieve issued identities |
| POST | `/admin/revoke-permanently/{student_user_id}` | Permanently revoke identity |
| POST | `/admin/replace-wallet/{student_user_id}` | Replace student wallet |

---

## 9.6 Verification APIs

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/verify/{wallet_address}` | Blockchain verification by wallet |
| GET | `/public/verify/{token_id}` | Public verification by Token ID |
| GET | `/public/qr-session/{token_id}` | Generate short-lived signed QR session |
| GET | `/public/verify-qr/{qr_token}` | Verify signed QR reference |

---

# 10. Database Design

The main database entities include:

| Entity | Purpose |
|---|---|
| User | Stores wallet, role, account status and login nonce |
| StudentProfile | Stores personal and academic student information |
| AdminProfile | Stores administrator profile information |
| TokenRequest | Stores Digital Student ID issuance requests |
| StudentToken | Stores issued identity token information |
| TransactionLog | Stores blockchain transaction information |
| RevocationLog | Stores revocation details |
| AuditLog | Stores important administrative events |

The database manages institutional and operational information while blockchain maintains the identity state required for independent verification.

---

# 11. Authentication and Security

## 11.1 Student Authentication

PeraSoul uses cryptographic wallet authentication rather than student passwords.

Authentication uses:

- MetaMask wallet
- One-time backend-generated nonce
- Signed login message
- Backend signature recovery

A wallet address alone cannot authenticate a student.

---

## 11.2 Administrator Authentication

Both Technical Administrators and University Administrators use MetaMask-based authentication.

The process is:

1. Administrator selects an authorized MetaMask wallet.
2. Backend generates a one-time challenge.
3. MetaMask signs the challenge.
4. Backend verifies the recovered wallet address.
5. Backend checks the administrator role.
6. Backend checks account status.
7. Backend confirms that the JWT wallet matches the current database wallet.
8. The appropriate administrator dashboard is opened.

The same login page can therefore support both administrator roles while the backend maintains strict role separation.

---

## 11.3 Role-Based Authorization

PeraSoul separates administrative permissions.

### Technical Administrator

Responsible for:

- Creating University Administrators
- Activating/Disabling University Administrators
- Changing administrator wallets

### University Administrator

Responsible for:

- Student approval
- Token issuance
- Revocation
- Student wallet replacement

This reduces unnecessary privilege sharing.

---

## 11.4 Backend Blockchain Signing

The blockchain administrative private key is never sent to the browser.

Blockchain state-changing operations are performed as:

**Authorized Browser Request → FastAPI Backend → Web3.py → Backend Signing Wallet → Ethereum Sepolia**

The browser administrators only authorize application operations.

They do not receive the backend blockchain private key.

---

## 11.5 Secret Management

Sensitive information such as:

- Blockchain private keys
- JWT secrets
- RPC credentials

must be stored outside source-controlled application code.

Sensitive `.env` files and key material must be excluded using `.gitignore`.

Any key that has previously been exposed must not be considered suitable for production deployment.

---

# 12. QR-Based Public Verification

The final PeraSoul system includes **short-lived signed QR verification**.

Each QR verification code is valid for approximately:

**10 seconds**

The QR does not directly contain private student information.

Instead, it contains a signed verification reference.

---

## 12.1 QR Verification Process

The process is:

1. Student opens the QR Verification page.
2. Backend creates a signed QR verification session.
3. The frontend generates the QR code.
4. A countdown shows the remaining validity period.
5. A verifier opens the QR link.
6. The backend validates the signed QR reference.
7. The backend checks whether the QR has expired.
8. The student's current identity state is retrieved.
9. The verification page displays the current result.

---

## 12.2 Automatic QR Refresh

The live QR is automatically regenerated after approximately 10 seconds.

An expired QR reference is rejected.

This reduces the usefulness of copied or old QR screenshots.

---

## 12.3 QR and Identity Validity

Possession of a QR code does not automatically mean that the student identity is currently valid.

For example:

| Identity State | Verification Result |
|---|---|
| Active | Valid |
| Temporarily Revoked | Not Valid |
| Temporary revocation expired | Valid |
| Permanently Revoked | Not Valid |
| Replaced identity | Old identity not accepted |

The verification result therefore reflects the **current identity state**, not merely possession of the QR image.

---

# 13. Testing and Validation

Testing was performed across the backend, smart contracts and Sepolia integration.

---

## 13.1 Backend Testing

The final recorded backend automated test results were:

| Metric | Result |
|---|---:|
| Automated Tests | 49 |
| Passed | 49 |
| Failed | 0 |
| Pass Rate | 100% |
| Python Statement Coverage | 82% |
| Sepolia Read-Only Integration Tests | 8 / 8 Passed |
| Live Sepolia Transaction Workflows | 2 / 2 Passed |

Backend testing covered:

- Student registration
- Duplicate registration validation
- Nonce generation
- MetaMask signature verification
- Replay prevention
- Token requests
- Administrator authorization
- Student approval
- Token minting
- Temporary revocation
- Permanent revocation
- Wallet replacement
- Blockchain failure handling
- Database/blockchain synchronization
- Application startup
- OpenAPI generation
- Live Sepolia integration

---

## 13.2 Smart Contract Testing

The complete recorded Hardhat execution reported:

**38 passing tests**

The PeraSoul-specific Mocha suite contained:

**33 project-specific PeraSoul tests**

The tests covered:

- Token issuance
- One-token restrictions
- Ownership
- Access control
- Non-transferability
- Event emission
- Invalid operations
- Temporary revocation
- Permanent revocation
- Wallet replacement
- Zero-address validation
- State consistency

---

## 13.3 Frontend and End-to-End Validation

The final frontend was manually validated using workflows including:

- Student registration
- MetaMask connection
- Student signature login
- Pending account state
- University Administrator approval
- Digital Student ID request
- Token minting
- Active Digital Student ID
- Live 10-second QR verification
- Temporary revocation
- QR verification while revoked
- Automatic restoration
- Technical Administrator login
- University Administrator creation
- Administrator activation and disabling
- Administrator wallet management

---

# 14. Final System Features

The finalized PeraSoul prototype supports:

- Student registration
- MetaMask wallet selection
- Passwordless student authentication
- One-time login nonces
- Student dashboard
- Student approval workflow
- Technical Administrator role
- Multiple University Administrators
- MetaMask-based administrator authentication
- Administrator activation and disabling
- Administrator wallet replacement
- Digital Student ID requests
- Soulbound Token minting
- Non-transferable ERC-721 identity tokens
- Ethereum Sepolia deployment
- Web3.py blockchain integration
- Transaction receipt validation
- Blockchain transaction logging
- Public Token ID verification
- Live 10-second signed QR verification
- Automatic QR regeneration
- Temporary identity revocation
- Automatic restoration after temporary revocation
- Permanent revocation
- Student wallet replacement
- Role-based access control
- Backend-managed blockchain signing
- Student personal-data separation from blockchain state

---

# 15. Limitations

PeraSoul is currently an academic prototype.

Current limitations include:

- Smart contracts are deployed on Ethereum Sepolia rather than Ethereum Mainnet.
- SQLite is used as the prototype database.
- Institutional-scale performance testing has not been performed.
- Production deployment would require stronger blockchain key-management infrastructure.
- University policy, privacy and governance requirements would need formal review.
- Real university Student Information System integration has not yet been implemented.
- Public QR verification depends on the application being reachable by the verifier's device.
- Sepolia transaction confirmation times depend on public test-network conditions.

The project demonstrates technical feasibility rather than production readiness.

---

# 16. Future Development

Possible future improvements include:

## 16.1 University System Integration

- Integration with Student Information Systems
- Automated student-record validation
- Examination access
- Library services
- Laboratory access
- Hostel and facility access

## 16.2 Multi-University Academic Identity

PeraSoul can also form a foundation for future research into a broader decentralized education system.

Potential extensions include:

- Cross-university digital identity
- Academic credential verification
- Blockchain-backed transcripts
- Academic credit records
- Cross-university module recognition
- Distributed academic qualification verification

## 16.3 Technical Improvements

- PostgreSQL database
- Production HTTPS hosting
- Managed blockchain signing infrastructure
- Multisignature administrative controls
- Hardware-backed keys
- Mobile application
- Advanced monitoring and logging
- Smart contract upgrade strategy
- University-wide deployment
- Expanded automated security testing

---

# 17. Conclusion

PeraSoul demonstrates how blockchain technology can be used for university identity management without storing all student information on a public blockchain.

The finalized project combines:

- MetaMask-based cryptographic authentication
- FastAPI backend services
- SQLAlchemy relational data management
- Solidity smart contracts
- Soulbound Token concepts
- Ethereum Sepolia
- Role-based administrator access
- Technical Administrator management
- Multiple University Administrators
- Identity lifecycle management
- Temporary and permanent revocation
- Student wallet replacement
- Public verification
- Short-lived signed QR verification

The university remains responsible for approving students and controlling identity issuance, while blockchain provides a tamper-resistant and independently verifiable layer for token ownership and identity validity.

PeraSoul therefore demonstrates a practical **hybrid blockchain architecture for Digital University Student Identity management**.

---

# 18. Links

- [Project Repository](https://github.com/cepdnaclk/e23-co2060-University-Digital-ID-sbt/)
- [Project Page](https://cepdnaclk.github.io/e23-co2060-University-Digital-ID-sbt/)
- [Department of Computer Engineering](https://www.ce.pdn.ac.lk/)
- [Faculty of Engineering](https://eng.pdn.ac.lk/)
- [University of Peradeniya](https://www.pdn.ac.lk/)

---

## Project Information

| Item | Details |
|---|---|
| Project | PeraSoul |
| Course | CO2060 - Software Systems Design Project |
| Department | Department of Computer Engineering |
| Faculty | Faculty of Engineering |
| University | University of Peradeniya |
| Blockchain | Ethereum |
| Network | Sepolia Test Network |
| Identity Technology | Soulbound Token |
| Year | 2026 |

---

[//]: # (Markdown syntax reference)
[//]: # (https://github.com/adam-p/markdown-here/wiki/Markdown-Cheatsheet)
