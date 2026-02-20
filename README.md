<p align="center">
  <img src="https://img.shields.io/badge/Algorand-Testnet-blue?style=for-the-badge&logo=algorand" />
  <img src="https://img.shields.io/badge/App%20ID-755784943-green?style=for-the-badge" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react" />
  <img src="https://img.shields.io/badge/FastAPI-0.104+-009688?style=for-the-badge&logo=fastapi" />
  <img src="https://img.shields.io/badge/PyTEAL-Smart%20Contracts-black?style=for-the-badge" />
</p>

# 🛡️ WhistleChain — Decentralized Whistleblower Protection & Bounty Protocol

> **A tamper-proof, anonymous complaint system where whistleblowers get paid automatically when evidence is verified — and nobody can delete the submission, not even the government.**

**RIFT 2026 Hackathon | Web3 / Algorand Track**

---

## 📋 Table of Contents

- [Problem Statement](#-problem-statement)
- [What is WhistleChain](#-what-is-whistlechain)
- [Live Demo](#-live-demo)
- [App ID (Testnet)](#-app-id-testnet)
- [Architecture Overview](#-architecture-overview)
- [Tech Stack](#-tech-stack)
- [Installation & Setup](#-installation--setup)
- [Usage Guide](#-usage-guide)
- [7-Step Verification Pipeline](#-7-step-verification-pipeline)
- [Smart Contract Details](#-smart-contract-details)
- [Known Limitations](#-known-limitations)
- [Team Members](#-team-members)

---

## 🔴 Problem Statement

**India loses ₹1.78 lakh crore annually to corruption** (Transparency International, 2024).

Whistleblowers who try to expose corruption face retaliation, threats, evidence suppression, and zero protection. Every existing system — police complaints, RTI filings, anonymous emails, media tips — has a **single point of failure** that can be corrupted, hacked, or legally coerced.

| Existing Approach | Why It Fails |
|---|---|
| File complaint to police | Police can be compromised; your name is on record |
| Email a journalist | Email is traceable; media can be pressured |
| Submit RTI | RTI officer can "lose" the request |
| Post anonymously online | Platform can delete it under pressure |
| Report to NGO | NGO can be bought or shut down |

**What's needed:** A system where anonymity is mathematical (not promised), evidence is physically impossible to delete, payments are triggered by code (not humans), and publication cannot be censored by any single authority.

---

## 💡 What is WhistleChain

WhistleChain is a **decentralized whistleblower protection and bounty protocol** built on the **Algorand blockchain**.

**In one line:** An anonymous, tamper-proof complaint box where you get paid automatically when your evidence is verified, and nobody can delete your submission.

### Core Pipeline

```
Whistleblower (Anonymous Wallet)
        │
        ▼
Evidence Submission → IPFS Storage (global, undeletable)
        │
        ▼
Smart Contract (Algorand) → Timestamps evidence permanently
        │
        ▼
Multi-Inspector Verification (Commit-Reveal Protocol)
        │
        ▼
Bounty Auto-Payout (ALGO to whistleblower wallet)
        │
        ▼
Auto-Publication (Twitter, Telegram, Email, RTI) → Censorship-resistant
```

### Why Blockchain?

| Problem | Normal Website | WhistleChain on Algorand |
|---|---|---|
| Server raided | ALL data deleted | IPFS = data on 1000s of global nodes |
| Government demands identity | We have your email/phone | Anonymous wallet = no identity to reveal |
| Admin bribed to delete evidence | Admin can delete | Smart contract = code can't be bribed |
| Platform refuses to pay bounty | Company controls funds | Smart contract auto-pays; we can't block it |
| Legal takedown order | Platform complies | IPFS hash on blockchain = permanently public |

**Principle:** A website requires trust in us. Blockchain requires trust in math.

---

## 🚀 Live Demo

| Resource | Link |
|---|---|
| **Live Demo URL** | *[To be deployed]* |
| **LinkedIn Demo Video** | *[To be added]* |
| **GitHub Repository** | `https://github.com/[your-repo]/whistlechain` |

---

## 🔗 App ID (Testnet)

| Parameter | Value |
|---|---|
| **App ID** | `755784943` |
| **Network** | Algorand Testnet |
| **Explorer** | [View on Lora Explorer](https://lora.algokit.io/testnet/application/755784943) |
| **Algo Explorer** | [View on Allo Explorer](https://app.dappflow.org/explorer/application/755784943) |
| **Contract** | Evidence Registry (PyTEAL) |

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React 19)                      │
│  Home · Submit · Dashboard · Inspector · Resolution · Admin     │
│  Vite 6 + TailwindCSS 4 + Zustand 5 + React Router 7           │
└───────────────────────────┬─────────────────────────────────────┘
                            │ Axios (REST API)
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     BACKEND (FastAPI + Uvicorn)                  │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐     │
│  │  Evidence     │  │ Verification │  │  Publication Bot   │     │
│  │  Submission   │  │  Engine      │  │  (Twitter, TG,     │     │
│  │  + Encryption │  │  Commit-     │  │   Email, RTI)      │     │
│  │  + IPFS Upload│  │  Reveal +    │  │                    │     │
│  │              │  │  Inspector   │  │                    │     │
│  └──────────────┘  │  Pool        │  └────────────────────┘     │
│                     └──────────────┘                              │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐     │
│  │  Resolution  │  │  Bounty      │  │  Audit Trail       │     │
│  │  Service     │  │  Manager     │  │  Service           │     │
│  └──────────────┘  └──────────────┘  └────────────────────┘     │
└───────────────────────────┬─────────────────────────────────────┘
                            │ py-algorand-sdk
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                   ALGORAND TESTNET                               │
│                                                                  │
│  ┌──────────────────────────────────────────────────┐           │
│  │  Evidence Registry Smart Contract (App 755784943)│           │
│  │  ─────────────────────────────────────────────── │           │
│  │  • submit_evidence()     → on-chain record       │           │
│  │  • begin_verification()  → assigns inspectors    │           │
│  │  • update_status()       → VERIFIED / REJECTED   │           │
│  │  • resolve_evidence()    → stake refund/forfeit  │           │
│  │  • publish_evidence()    → public audit record   │           │
│  │  • Box Storage           → per-evidence metadata │           │
│  └──────────────────────────────────────────────────┘           │
│                                                                  │
│  IPFS (Pinata) ← Encrypted evidence files (AES-256)            │
└─────────────────────────────────────────────────────────────────┘
```

### Smart Contract ↔ Frontend Interaction Flow

```
1. User submits evidence on frontend
2. Frontend → POST /evidence/submit → Backend
3. Backend encrypts files (AES-256) → uploads to IPFS → gets hash
4. Backend calls smart contract: submit_evidence(ipfs_hash, category, stake)
5. Smart contract records on Algorand blockchain with timestamp
6. Admin clicks "Begin Verification" → Backend calls begin_verification()
7. 3+ inspectors randomly assigned, commit-reveal protocol begins
8. Inspectors commit hashed verdicts → reveal → finalize
9. Smart contract tallies votes (67% consensus threshold)
10. Resolution: stake refunded (verified) or forfeited (fake)
11. Publication bot broadcasts to Twitter, Telegram, Email, RTI
```

---

## 🛠️ Tech Stack

### Blockchain Layer

| Technology | Purpose |
|---|---|
| **Algorand Testnet** | Blockchain infrastructure |
| **AlgoKit** | Algorand development framework |
| **PyTEAL** | Smart contract language |
| **py-algorand-sdk** `≥2.4.0` | Python SDK for Algorand interaction |
| **Box Storage** | Per-evidence on-chain metadata |

### Backend

| Technology | Purpose |
|---|---|
| **Python 3.13** | Backend runtime |
| **FastAPI** `≥0.104.0` | REST API framework |
| **Uvicorn** | ASGI server |
| **PyCryptodome** `≥3.20.0` | AES-256 encryption |
| **IPFS (Pinata)** | Decentralized file storage |
| **Google Gemini API** | AI-powered evidence analysis |

### Frontend

| Technology | Purpose |
|---|---|
| **React** `19.0.0` | UI framework |
| **Vite** `6.4.1` | Build tool |
| **TailwindCSS** `4.0.6` | Utility-first CSS |
| **Zustand** `5.0.3` | Global state management |
| **React Router** `7.1.1` | Client-side routing |
| **Axios** `1.7.9` | HTTP client |
| **Lucide React** | Icon library |

---

## ⚙️ Installation & Setup

### Prerequisites

- **Python** `≥ 3.11`
- **Node.js** `≥ 18`
- **npm** `≥ 9`
- **AlgoKit** (optional, for smart contract deployment)
- **Git**

### 1. Clone the Repository

```bash
git clone https://github.com/[your-repo]/whistlechain.git
cd whistlechain
```

### 2. Backend Setup

```bash
cd whistlechain

# Create virtual environment
python -m venv venv

# Activate (Windows)
.\venv\Scripts\Activate.ps1
# Activate (macOS/Linux)
source venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt
```

### 3. Environment Variables

Create a `.env` file in the `whistlechain/` directory:

```env
# Algorand Testnet
ALGOD_SERVER=https://testnet-api.algonode.cloud
ALGOD_PORT=443
ALGOD_TOKEN=

# Deployed Contract
EVIDENCE_REGISTRY_APP_ID=755784943

# IPFS (Pinata)
PINATA_JWT=your_pinata_jwt_here

# AI Analysis (optional)
GEMINI_API_KEY=your_gemini_api_key_here
```

### 4. Start Backend

```bash
cd whistlechain
.\venv\Scripts\Activate.ps1
$env:PYTHONPATH = "."
uvicorn backend.api.main:app --reload --port 8000
```

Backend will be available at `http://localhost:8000`

### 5. Frontend Setup

```bash
cd whistlechain/frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

Frontend will be available at `http://localhost:5173`

### 6. Seed Demo Data (Optional)

```bash
cd whistlechain
python seed_data.py
```

This creates sample evidence submissions, registers test inspectors, and runs a complete verification workflow.

---

## 📖 Usage Guide

### Step 1: Submit Evidence

Navigate to **Submit** → Create an anonymous wallet → Select corruption category → Fill evidence details → Upload supporting files → Stake ALGO tokens → Submit.

![Submit Evidence](docs/screenshots/submit.png)

### Step 2: Track on Dashboard

View all your submissions on the **Dashboard** page. Filter by status: Pending, Under Verification, Verified, Rejected, Resolved.

![Dashboard](docs/screenshots/dashboard.png)

### Step 3: Inspector Verification

Inspectors sign in at **Inspector Portal** → View assigned cases → Commit verdict (with secret nonce) → Advance to reveal phase → Reveal verdict with justification → Finalize session.

![Inspector Portal](docs/screenshots/inspector.png)

### Step 4: Resolution

Navigate to **Resolution** → View finalized cases → Resolve (stake refunded for verified, forfeited for fake) → View resolution history.

![Resolution](docs/screenshots/resolution.png)

### Step 5: Admin Controls

**Admin Portal** provides full oversight: Begin verification on pending submissions, manage inspectors, view sessions, resolve cases, and publish to social media.

![Admin Portal](docs/screenshots/admin.png)

### Step 6: Audit Trail

**Audit Trail** page shows the complete transparency ledger — every submission, verification, and resolution event with blockchain transaction IDs.

![Audit Trail](docs/screenshots/audit.png)

---

## 🔄 7-Step Verification Pipeline

| Step | Action | Technical Detail |
|---|---|---|
| **1. Submit** | Whistleblower uploads evidence | Files encrypted (AES-256) → IPFS → Algorand smart contract |
| **2. Stake** | Stake ALGO tokens as bond | Locked in smart contract; prevents spam/false reports |
| **3. Register** | Blockchain registration | IPFS hash + metadata recorded on Algorand (immutable) |
| **4. Assign** | Inspector assignment | 3+ inspectors randomly selected from eligible pool |
| **5. Verify** | Commit-Reveal protocol | Inspectors commit hashed verdicts → reveal → prevents collusion |
| **6. Resolve** | Resolution & stakes | 67% consensus → VERIFIED/REJECTED; stakes returned/forfeited |
| **7. Publish** | Social media publication | Auto-publish to Twitter/X, Telegram, Email, RTI portals |

---

## 📜 Smart Contract Details

### Evidence Registry (`App ID: 755784943`)

**Language:** PyTEAL (Algorand Python Smart Contract)

**State Schema:**
- **Global State:** `evidence_counter` (uint64), `admin` (address), `total_staked` (uint64), `total_forfeited` (uint64)
- **Box Storage:** Per-evidence metadata (evidence_id → serialized struct)

**Methods:**

| Method | Description |
|---|---|
| `submit_evidence(ipfs_hash, category, org, stake)` | Create on-chain evidence record with locked stake |
| `begin_verification(evidence_id, window_end, num_inspectors)` | Open verification session |
| `update_status(evidence_id, new_status)` | Update evidence status (admin/oracle) |
| `resolve_evidence(evidence_id, verdict)` | Auto-resolve based on verification outcome |
| `refund_stake(evidence_id)` | Return stake to whistleblower (verified) |
| `forfeit_stake(evidence_id)` | Send stake to treasury (fake evidence) |
| `publish_evidence(evidence_id)` | Mark as PUBLIC with immutable audit record |

**Evidence Categories & Minimum Stakes:**

| Category | Min Stake | Verification Window |
|---|---|---|
| Financial Fraud | 25 ALGO | 72 hours |
| Construction Fraud | 50 ALGO | 168 hours (7 days) |
| Food Safety | 25 ALGO | 48 hours |
| Academic Fraud | 15 ALGO | 72 hours |

**Anti-Corruption Mechanisms:**

1. **Blind Assignment** — Inspectors randomly assigned; no one knows who else is inspecting
2. **Commit-Reveal Voting** — Two-phase protocol cryptographically prevents vote copying
3. **Mandatory Justification** — Inspectors must upload inspection evidence to IPFS
4. **Reputation Tracking** — On-chain consistency score; liars gradually lose credibility
5. **67% Quorum** — No single inspector can decide; minimum 3 inspectors required

---

## ⚠️ Known Limitations

| Limitation | Detail |
|---|---|
| **In-memory storage** | Backend uses in-memory data stores; data is lost on server restart. Production would use persistent on-chain box storage. |
| **Simulated publication** | Twitter/Telegram/Email publications are simulated (logged, not actually sent) for the hackathon demo. |
| **No real wallet integration** | Wallets are generated server-side for demo purposes. Production would use Pera/Defly wallet connect. |
| **Single smart contract** | Only the Evidence Registry contract is deployed. The full 5-contract architecture (Verification Engine, Inspector Pool, Bounty Escrow, Publication Engine) is implemented in the backend. |
| **Oracle is centralized** | The oracle/verification service runs as a centralized backend. Production would use decentralized oracle networks. |
| **No real government API** | Government e-Procurement API calls are simulated. |
| **Testnet only** | Deployed on Algorand Testnet; not production-ready for mainnet. |
| **No TOR/VPN integration** | Maximum anonymity would require TOR browser; the current frontend runs on standard HTTPS. |

---

## 👥 Team Members

| Name | Role |
|---|---|
| **Karnajeet Gosavi** | Lead Developer — Smart contracts, backend architecture, frontend development, system design, blockchain integration |
| **Manas Bagul** | Team Member |
| **Archit Bagad** | Team Member |
| **Jay Gautam** | Team Member |

---

## 📄 License

This project was built for the **RIFT 2026 Hackathon** (Web3 / Algorand Track).

---

<p align="center">
  <b>WhistleChain</b> — Because corruption should fear mathematics, not the other way around.
</p>
