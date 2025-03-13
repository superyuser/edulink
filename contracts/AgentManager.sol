// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./CertificateNFT.sol";

contract AgentManager is Ownable {
    CertificateNFT public certificateContract;
    
    // Mapping to track authorized agents
    mapping(address => bool) public authorizedAgents;
    
    // Events
    event AgentAuthorized(address indexed agent);
    event AgentRevoked(address indexed agent);
    event CertificateRequested(
        address indexed recipient,
        string courseName,
        string metadataURI
    );

    constructor(address _certificateContract) Ownable(msg.sender) {
        certificateContract = CertificateNFT(_certificateContract);
    }

    modifier onlyAuthorizedAgent() {
        require(
            authorizedAgents[msg.sender] || owner() == msg.sender,
            "Not authorized"
        );
        _;
    }

    // Agent management functions
    function authorizeAgent(address agent) external onlyOwner {
        authorizedAgents[agent] = true;
        emit AgentAuthorized(agent);
    }

    function revokeAgent(address agent) external onlyOwner {
        authorizedAgents[agent] = false;
        emit AgentRevoked(agent);
    }

    // Certificate management functions
    function requestCertificate(
        address recipient,
        string memory courseName,
        string memory metadataURI
    ) external onlyAuthorizedAgent {
        emit CertificateRequested(recipient, courseName, metadataURI);
        certificateContract.safeMint(recipient, courseName, metadataURI);
    }

    function verifyCertificate(uint256 tokenId) external onlyAuthorizedAgent {
        certificateContract.verifyCertificate(tokenId);
    }

    // View functions
    function isAuthorizedAgent(address agent) public view returns (bool) {
        return authorizedAgents[agent];
    }
}