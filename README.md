# Edulink: Decentralized Education Platform with Autonomous AgentKit

## Project Vision

Imagine a world where education is borderless, verified, and truly decentralized. Our platform transforms the traditional educational journey into a dynamic, blockchain-powered experience by issuing immutable NFT certificates for every completed course. These digital credentials form an "education chain" that provides secure, verifiable proof of learning accessible by anyone, anywhere. By integrating Coinbase’s AgentKit, we empower users to interact with the blockchain using natural language—abstracting complex crypto operations into seamless, intuitive actions. As the project evolves, this ecosystem will enable global institutions, employers, and learners to trust and verify academic achievements, setting a new standard for educational transparency and impact.

## MVP Overview

At its current stage, our MVP demonstrates the core functionalities of our vision:
- **Smart Contract Integration:**  
  - A Solidity smart contract using OpenZeppelin’s ERC721 standard to mint NFT certificates upon course completion.
- **Autonomous Agent:**  
  - Integration of Coinbase AgentKit to build an agent that processes natural language commands and autonomously triggers on-chain actions (e.g., minting certificates and transferring rewards).
- **User Dashboard:**  
  - A React-based frontend that displays a user’s “education chain” and connects to the blockchain via MetaMask and ethers.js.
- **Blockchain Connectivity:**  
  - Deployment on the Ethereum Goerli testnet with reliable node connectivity via [Infura](https://infura.io) or [Alchemy](https://www.alchemy.com).

## Implementation Workflow

### 1. Project Setup
- **Initialize Environment:**  
  - Set up a new Node.js project and Git repository.
  - Create separate directories for smart contracts, frontend, and deployment scripts.
- **Tools:**  
  - [Node.js](https://nodejs.org)  
  - [Git](https://git-scm.com)

### 2. Smart Contract Development
- **Contract Development:**  
  - Write `CertificateNFT.sol` using [Solidity](https://soliditylang.org) and [OpenZeppelin ERC721](https://openzeppelin.com/contracts/).
- **Development Environment:**  
  - Use [Hardhat](https://hardhat.org) for compiling, testing, and deploying contracts.
- **Testing & Deployment:**  
  - Write unit tests with Mocha/Chai and deploy on the Goerli testnet using [Infura](https://infura.io) or [Alchemy](https://www.alchemy.com).

### 3. Autonomous Agent Integration
- **AgentKit Integration:**  
  - Build an autonomous agent using [Coinbase AgentKit](https://docs.cdp.coinbase.com/agentkit/docs/welcome) to process natural language commands (e.g., "mint my certificate").
- **Agent Capabilities:**  
  - Enable the agent to trigger smart contract functions and manage token transfers, abstracting blockchain operations behind a conversational interface.

## User Flow

1. **Course Discovery (LLM Interface)**
   User Query → Course Recommendations → Course Details

2. **Learning Process**
   Access Materials → Complete Course → Verification

3. **Certificate Minting**
   University Verification → NFT Minting → Chain Update

4. **Token Economics**
   Course Completion → EduToken Rewards → Service Access

## Project Setup TODO List

### 1. Smart Contract Setup
- [ ] Install dependencies:
  ```bash
  npm install @openzeppelin/contracts hardhat
  ```
- [ ] Create and deploy contracts:
  - [ ] Deploy `CourseCatalog.sol`
  - [ ] Deploy `EduToken.sol` (ERC20 for credits)
  - [ ] Deploy `CertificateNFT.sol`
  - [ ] Link contracts together

### 2. Database Setup
- [ ] Install PostgreSQL
- [ ] Create database:
  ```bash
  createdb edulink
  ```
- [ ] Set up Python environment:
  ```bash
  python -m venv venv
  source venv/bin/activate  # or `venv\Scripts\activate` on Windows
  pip install -r requirements.txt
  ```
- [ ] Run database migrations:
  ```bash
  alembic init alembic
  alembic revision --autogenerate -m "Initial migration"
  alembic upgrade head
  ```

### 3. Backend Implementation
- [ ] Complete API endpoints in `main.py`:
  - [ ] Course search
  - [ ] Course enrollment
  - [ ] Progress tracking
  - [ ] Certificate minting
- [ ] Implement LLM interface:
  - [ ] Set up course matching
  - [ ] Query processing
  - [ ] Course recommendations
- [ ] Create course scraping scripts:
  - [ ] University course scraper
  - [ ] Course material collector
  - [ ] IPFS integration

### 4. Frontend Development
- [ ] Set up v0:
  - [ ] Course discovery interface
  - [ ] Learning dashboard
  - [ ] Certificate viewer
  - [ ] Educational history chain
- [ ] Implement Web3 integration:
  - [ ] MetaMask connection
  - [ ] Smart contract interaction
  - [ ] Transaction handling

### 5. Testing
- [ ] Smart Contracts:
  ```bash
  npx hardhat test
  ```
- [ ] Backend:
  ```bash
  pytest backend/tests
  ```
- [ ] Integration tests:
  - [ ] Course completion flow
  - [ ] Certificate minting
  - [ ] Credit distribution

### 6. Deployment
- [ ] Smart Contracts:
  - [ ] Deploy to Goerli testnet
  - [ ] Verify contracts on Etherscan
- [ ] Backend:
  - [ ] Set up production database
  - [ ] Deploy FastAPI server
- [ ] Frontend:
  - [ ] Deploy v0 interface

## Project Structure
```
edulink/
├── contracts/               # Ethereum Smart Contracts
│   ├── CertificateNFT.sol  # NFT certificates
│   ├── CourseCatalog.sol   # Course management
│   └── EduToken.sol        # Educational credits
├── backend/                # Python Backend
│   ├── models.py          # Database models
│   ├── database.py        # Database connection
│   ├── main.py           # FastAPI endpoints
│   └── llm_interface.py   # Course matching
└── frontend/              # v0 Interface
```

## Environment Setup

1. Create `.env` file:
```env
DATABASE_URL=postgresql://user:password@localhost/edulink
OPENAI_API_KEY=your_key_here  # For LLM interface
```

2. Install dependencies:
```bash
# Backend
pip install -r requirements.txt

# Smart Contracts
npm install
```

## Development Workflow

1. Start local blockchain:
```bash
npx hardhat node
```

2. Run backend:
```bash
uvicorn backend.main:app --reload
```

3. Run frontend:
```bash
# v0 commands
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request