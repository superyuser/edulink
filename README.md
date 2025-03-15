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
