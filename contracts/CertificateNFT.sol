// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./CourseCatalog.sol";

contract CertificateNFT is ERC721URIStorage, Ownable {
    // State variables
    uint256 private _nextTokenId;
    CourseCatalog public courseCatalog;
    
    struct Certificate {
        bytes32 courseId;
        uint256 completionDate;
        address recipient;
        uint8 grade;          // Grade stored as a number (e.g., 85 for B)
        bool isVerified;
    }
    
    // Mappings
    mapping(uint256 => Certificate) public certificates;
    mapping(address => mapping(bytes32 => bool)) public completedCourses;
    mapping(address => uint256[]) public studentCertificates;
    
    // Events
    event CertificateMinted(
        uint256 indexed tokenId,
        address indexed recipient,
        bytes32 indexed courseId,
        uint256 completionDate,
        uint8 grade
    );

    event CertificateVerified(
        uint256 indexed tokenId,
        address indexed verifier
    );

    constructor(address _courseCatalog) ERC721("EduLink Certificate", "EDU") Ownable(msg.sender) {
        courseCatalog = CourseCatalog(_courseCatalog);
    }

    function safeMint(
        address to,
        bytes32 courseId,
        uint8 grade,
        string memory uri
    ) public onlyOwner {
        // Verify course exists in catalog
        (,,,,,bool isActive) = courseCatalog.getCourse(courseId);
        require(isActive, "Course not found in catalog");
        
        uint256 tokenId = _nextTokenId++;
        
        certificates[tokenId] = Certificate({
            courseId: courseId,
            completionDate: block.timestamp,
            recipient: to,
            grade: grade,
            isVerified: false
        });
        
        completedCourses[to][courseId] = true;
        studentCertificates[to].push(tokenId);
        
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        
        emit CertificateMinted(
            tokenId,
            to,
            courseId,
            block.timestamp,
            grade
        );
    }

    function verifyCertificate(uint256 tokenId) external onlyOwner {
        require(_exists(tokenId), "Certificate does not exist");
        certificates[tokenId].isVerified = true;
        emit CertificateVerified(tokenId, msg.sender);
    }

    function getStudentCertificates(address student) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return studentCertificates[student];
    }

    function getCertificate(uint256 tokenId) 
        external 
        view 
        returns (
            bytes32 courseId,
            uint256 completionDate,
            address recipient,
            uint8 grade,
            bool isVerified
        ) 
    {
        require(_exists(tokenId), "Certificate does not exist");
        Certificate memory cert = certificates[tokenId];
        return (
            cert.courseId,
            cert.completionDate,
            cert.recipient,
            cert.grade,
            cert.isVerified
        );
    }

    function hasCompletedCourse(address student, bytes32 courseId) 
        external 
        view 
        returns (bool) 
    {
        return completedCourses[student][courseId];
    }

    function hasCompletedPrerequisites(
        address student, 
        bytes32 courseId
    ) external view returns (bool) {
        uint256[] memory certs = studentCertificates[student];
        bytes32[] memory completed = new bytes32[](certs.length);
        
        // Get all completed courses
        for (uint i = 0; i < certs.length; i++) {
            completed[i] = certificates[certs[i]].courseId;
        }
        
        // Check prerequisites using CourseCatalog
        return courseCatalog.validatePrerequisites(courseId, completed);
    }

    // Override required functions
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function _burn(uint256 tokenId) 
        internal
        override(ERC721URIStorage)
    {
        super._burn(tokenId);
    }
}