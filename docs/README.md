---
layout: home
permalink: index.html

# Please update this with your repository name and project title
repository-name: e23-co2060-University-Digital-ID-sbt
title: Blockchain-Based Digital Identity System Using Soulbound Tokens
---

[comment]: # "This is the standard layout for the project, but you can clean this and use your own template, and add more information required for your own project"

<!-- Once you fill the index.json file inside /docs/data, please make sure the syntax is correct. (You can use this tool to identify syntax errors)

Please include the "correct" email address of your supervisors. (You can find them from https://people.ce.pdn.ac.lk/ )

Please include an appropriate cover page image ( cover_page.jpg ) and a thumbnail image ( thumbnail.jpg ) in the same folder as the index.json (i.e., /docs/data ). The cover page image must be cropped to 940×352 and the thumbnail image must be cropped to 640×360 . Use https://croppola.com/ for cropping and https://squoosh.app/ to reduce the file size.

If your followed all the given instructions correctly, your repository will be automatically added to the department's project web site (Update daily)

A HTML template integrated with the given GitHub repository templates, based on github.com/cepdnaclk/eYY-project-theme . If you like to remove this default theme and make your own web page, you can remove the file, docs/_config.yml and create the site using HTML. -->

# Project Title

---

## Team
-  E/23/054, M.V.R. Dayananda, [email](e23054@eng.pdn.ac.lk)

<!-- Image (photo/drawing of the final hardware) should be here -->

<!-- This is a sample image, to show how to add images to your page. To learn more options, please refer [this](https://projects.ce.pdn.ac.lk/docs/faq/how-to-add-an-image/) -->

<!-- ![Sample Image](./images/sample.png) -->

#### Table of Contents
1. [Introduction](#introduction)
2. [Solution Architecture](#solution-architecture )
3. [Software Designs](#hardware-and-software-designs)
4. [Testing](#testing)
5. [Conclusion](#conclusion)
6. [Links](#links)

## Introduction

### Background
In modern universities, student identity management is handled using centralized systems such as ID cards and databases. These systems are vulnerable to identity forgery, data breaches, lack of interoperability, and difficulty in verification across institutions.

### Problem Statement
Traditional identity systems:
- Can be duplicated or forged  
- Require manual verification  
- Are controlled by a single authority (centralized risk)  
- Do not provide ownership of identity to students  

### Proposed Solution
This project proposes a blockchain-based digital identity system using Soulbound Tokens (SBTs):
- Each student is assigned a non-transferable token (NFT)  
- Token contains verified academic identity data  
- Stored securely on blockchain  
- Cannot be sold or transferred  

### Impact
- Improved security and trust  
- Instant identity verification  
- Useful for academic and professional use  
- Scalable beyond universities (jobs, certifications) 


## Solution Architecture

### 2.1 High-Level Overview
The system consists of three main layers:

1. **Frontend Layer**
   - User interface for students and admins  
   - Handles registration and identity viewing  

2. **Backend Layer**
   - Handles APIs and business logic  
   - Connects frontend with blockchain  

3. **Blockchain Layer**
   - Stores Soulbound Tokens  
   - Executes smart contracts  

---

### 2.2 Core Components

#### Frontend
- Student Dashboard  
- Admin Panel  
- Wallet Integration (e.g., MetaMask)  

#### Backend APIs
- Token Issuance API  
- Token Revocation API  
- Token Verification API  
- Token Information API  

#### Blockchain Module
- Mint Token Function  
- Revoke Token Function  
- Verify Token Function  
- Ownership Check  
- Transfer Restriction (SBT property)  

---

### 2.3 Data Flow
1. Student registers in the system  
2. Admin verifies student details  
3. Token is minted for the student  
4. Token is stored on blockchain  
5. Identity can be verified using the token  

---

## Software Designs


### 3.1 System Design
The system follows a layered architecture:
- Presentation Layer (Frontend)  
- Application Layer (Backend)  
- Data Layer (Blockchain)  

---

### 3.2 Data Structure Design
Each Soulbound Token includes:
- Name  
- Registration Number  
- Faculty  
- Department  
- Batch  
- Email  
- Mobile Number  

---

### 3.3 Smart Contract Design

#### Functions
- `mintToken(address, studentData)`  
- `revokeToken(tokenId)`  
- `verifyToken(tokenId)`  
- `getTokenInfo(tokenId)`  

#### Rules
- One student = One token  
- Tokens are non-transferable  

---

### 3.4 API Design

| API Endpoint | Description |
|-------------|------------|
| POST /mint  | Issue a new token |
| POST /revoke | Revoke an existing token |
| GET /verify | Verify token validity |
| GET /info | Retrieve token data |

---

### 3.5 UI/UX Design
- Simple and user-friendly interface  
- Student dashboard displaying identity  
- Admin panel for verification  
- QR-based identity verification system  

---

### 3.6 Security Design
- Blockchain ensures immutability  
- Admin-only access for token issuance  
- Encryption for sensitive data  
- Non-transferable token enforcement  

---

## Testing

### 4.1 Testing Types
- Unit Testing (Smart contracts and APIs)  
- Integration Testing (Frontend ↔ Backend ↔ Blockchain)  
- User Acceptance Testing  

---

### 4.2 Test Cases

| Test Case | Expected Result |
|----------|---------------|
| Mint token | Token created successfully |
| Duplicate student | Request rejected |
| Verify token | Valid identity returned |
| Revoke token | Token marked invalid |

---

### 4.3 Results Summary
- Token issuance successful  
- Verification accurate and fast  
- Non-transferability enforced  
- Minor UI improvements identified  

---

## Conclusion

### 5.1 Achievements
- Developed a decentralized identity system  
- Implemented Soulbound Token concept successfully  
- Enabled secure and efficient identity verification  

---

### 5.2 Future Developments
- Multi-university integration  
- Mobile application support  
- Biometric authentication  
- Cross-platform verification systems  

---

### 5.3 Commercialization Plans
- Applicable in:
  - Universities  
  - Government ID systems  
  - Recruitment platforms  

- Potential SaaS model:
  - Identity-as-a-Service (IDaaS)  

---

## Links

- [Project Repository][https://github.com/cepdnaclk/e23-co2060-University-Digital-ID-sbt](https://github.com/cepdnaclk/e23-co2060-University-Digital-ID-sbt){{ page.repository-name }}){:target="_blank"}
- [Project Page](https://cepdnaclk.github.io/{{ page.repository-name}}){:target="_blank"}
- [Department of Computer Engineering](http://www.ce.pdn.ac.lk/)
- [University of Peradeniya](https://eng.pdn.ac.lk/)

[//]: # (Please refer this to learn more about Markdown syntax)
[//]: # (https://github.com/adam-p/markdown-here/wiki/Markdown-Cheatsheet)
