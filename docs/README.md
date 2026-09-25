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
  Department of Manufacturing and Industrial Engineering, University of Peradeniya  
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

Universities traditionally use physical student identity cards together with centralized databases to identify students and provide access to university services.

Physical student identity cards are simple to use, but they have several limitations. They can be lost, damaged, copied, altered, shared with another person, or remain visually valid even after the student's actual status changes.

Centralized digital identity systems improve accessibility but still depend completely on a central database and authentication infrastructure.

PeraSoul investigates how blockchain technology and **Soulbound Tokens (SBTs)** can be used to provide a secure, non-transferable and verifiable Digital Student ID while still keeping personal student information under university control.

---

## 1.2 Project Overview

**PeraSoul** is a blockchain-based Digital University Student ID System.

Each approved student can receive a non-transferable ERC-721-based identity token associated with their registered Ethereum wallet.

The system combines:

- A web-based frontend
- A FastAPI backend
- A relational database
- MetaMask wallet authentication
- Ethereum smart contracts
- Ethereum Sepolia test network
- Soulbound Token-based Digital Student IDs
- Public identity verification
- Short-lived secure QR verification

The blockchain is not used to store all student personal information.

Instead, PeraSoul follows a **hybrid architecture**:

- Student profile and university information remain in the university-controlled database.
- Blockchain stores token ownership and the identity validity state required for verification.

This prevents unnecessary personal information from being publicly exposed on Ethereum.

---

# 2. Problem Statement

Traditional university identity systems have several limitations.

## Physical Identity Card Problems

- Cards can be lost or damaged.
- Cards can be copied or altered.
- Another person may attempt to use a stolen card.
- Verification often depends only on visual inspection.
- A physical card may continue to appear valid even when a student has been suspended.
- Replacement normally requires administrative processing.

## Centralized Digital Identity Problems

- The central database becomes a single point of trust.
- Unauthorized database modifications may affect identity records.
- Different university divisions may maintain separate records.
- External verification normally depends completely on university systems.

## Ordinary NFT Limitation

Traditional ERC-721 NFTs are transferable.

A Digital Student ID must not be transferable because a university identity belongs to a particular student.

## Authentication Problem

Knowing a wallet address is not sufficient to prove ownership because wallet addresses are public information.

The system therefore requires cryptographic proof that the user actually controls the registered wallet.

---

# 3. Proposed Solution

PeraSoul provides a university-controlled Digital Student ID represented using a **Soulbound Token**.

The complete workflow is:

1. A student registers through the web application.
2. The student connects a MetaMask wallet.
3. The registration is stored with **Pending** status.
4. A University Administrator reviews the student registration.
5. The University Administrator approves the student.
6. The approved student authenticates using a MetaMask signature.
7. The student requests a Digital Student ID.
8. A University Administrator reviews the token request.
9. The backend submits the token-minting transaction to Ethereum Sepolia.
10. A non-transferable identity token is issued to the student's wallet.
11. The student can display their Digital Student ID and live verification QR.
12. Third parties can verify the current identity status without administrator access.

The university can also:

- Temporarily revoke an identity
- Automatically restore validity after temporary revocation expires
- Permanently revoke an identity
- Replace a lost or compromised student wallet
- Manage multiple University Administrator accounts
- Maintain audit and transaction records

---

# 4. System Users

PeraSoul contains four main user roles.

## 4.1 Student

A student can:

- Register an account
- Connect a MetaMask wallet
- Authenticate using a wallet signature
- View account status
- View student profile
- Request a Digital Student ID
- View token status
- View blockchain validity
- Display a Digital Student ID
- Generate live QR verification codes
- Access wallet replacement information
- Use public identity verification

A student cannot mint or revoke their own identity.

---

## 4.2 University Administrator

A University Administrator manages student identity operations.

The role can:

- Authenticate using an authorized MetaMask wallet
- Review pending student registrations
- Approve students
- Review token requests
- Mint Digital Student IDs
- Monitor issued identities
- Temporarily revoke identities
- Permanently revoke identities
- Replace student wallets
- View system statistics
- Monitor blockchain transaction information

---

## 4.3 Technical Administrator

The Technical Administrator manages administrator access rather than normal student identity operations.

The role can:

- Authenticate using MetaMask
- Create University Administrator accounts
- Register authorized administrator wallets
- Activate University Administrators
- Disable University Administrators
- Change administrator wallet addresses
- Monitor administrator access configuration

The Technical Administrator does not normally approve students or mint student identity tokens.

This creates separation between:

**Technical access management**

and

**University identity operations**

---

## 4.4 Public Verifier

A Public Verifier does not need to log in.

Examples include:

- University security officers
- Lecturers
- Examination supervisors
- Library staff
- Event organizers
- Employers

A verifier can check whether a student's Digital Student ID is currently valid using:

- Token ID verification
- Live QR verification

Only the minimum information required for verification is displayed.

---

# 5. Solution Architecture

PeraSoul uses a **four-layer architecture**.

```text
+--------------------------------------------------+
|               PRESENTATION LAYER                 |
|                                                  |
| Student Portal                                   |
| Technical Administrator Portal                   |
| University Administrator Portal                  |
| Public Verification Interface                    |
| MetaMask                                         |
+-------------------------+------------------------+
                          |
                          | HTTPS / REST
                          v
+--------------------------------------------------+
|                APPLICATION LAYER                 |
|                                                  |
| Python                                           |
| FastAPI                                          |
| Pydantic Validation                              |
| Authentication / Authorization                   |
| Business Logic                                   |
| Web3.py Blockchain Service                       |
+-------------------+------------------------------+
                    |
          +---------+---------+
          |                   |
          v                   v
+------------------+   +----------------------------+
|    DATA LAYER    |   |      BLOCKCHAIN LAYER      |
|                  |   |                            |
| SQLAlchemy       |   | PeraSoulManager            |
| SQLite           |   | PeraSoul                   |
| Users            |   | Soulbound Token            |
| Profiles         |   |                            |
| Token Requests   |   | Ethereum Sepolia           |
| Token Records    |   |                            |
| Revocation Logs  |   | Token Ownership            |
| Transaction Logs |   | Validity / Revocation      |
| Audit Logs       |   | Non-transferability        |
+------------------+   +----------------------------+
