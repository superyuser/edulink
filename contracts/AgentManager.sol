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
        bytes32 indexed courseId,
        uint8 grade,
        uint256 credits,
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
        bytes32 courseId,
        uint8 grade,
        uint256 credits,
        string memory metadataURI
    ) external onlyAuthorizedAgent {
        // Get list of completed courses
        uint256[] memory certificates = certificateContract.getStudentCertificates(recipient);
        bytes32[] memory completedCourses = new bytes32[](certificates.length);
        
        // Build array of completed course IDs
        for (uint i = 0; i < certificates.length; i++) {
            (bytes32 completedCourseId,,,,,) = certificateContract.getCertificate(certificates[i]);
            completedCourses[i] = completedCourseId;
        }
        
        // Validate prerequisites
        require(
            certificateContract.courseCatalog().validatePrerequisites(courseId, completedCourses),
            "Prerequisites not met"
        );
        
        emit CertificateRequested(recipient, courseId, grade, credits, metadataURI);
        certificateContract.safeMint(recipient, courseId, grade, credits, metadataURI);
    }

    function verifyCertificate(uint256 tokenId) external onlyAuthorizedAgent {
        certificateContract.verifyCertificate(tokenId);
    }

    // View functions
    function isAuthorizedAgent(address agent) public view returns (bool) {
        return authorizedAgents[agent] || agent == owner();
    }
}