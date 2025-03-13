// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./CourseCatalog.sol";

contract CertificateNFT is ERC721URIStorage, Ownable {
    // State variables
    uint256 private _nextTokenId;
    CourseCatalog public courseCatalog;
    IERC20 public eduToken;  // ERC20 token for educational credits
    
    struct Certificate {
        bytes32 courseId;
        uint256 completionDate;
        address recipient;
        uint8 grade;          // Grade stored as a number (e.g., 85 for B)
        bool isVerified;
        uint256 creditsEarned;  // Credits earned for this course
    }
    
    // Educational history tracking
    struct EducationChain {
        uint256[] certificateIds;  // Array of certificate NFT IDs
        uint256 totalCredits;      // Total credits earned
        string[] specializations;   // Completed specializations/programs
    }
    
    // Mappings
    mapping(uint256 => Certificate) public certificates;
    mapping(address => mapping(bytes32 => bool)) public completedCourses;
    mapping(address => uint256[]) public studentCertificates;
    mapping(address => EducationChain) public educationHistory;
    mapping(address => bool) public authorizedUniversities;
    
    // Events
    event CertificateMinted(
        uint256 indexed tokenId,
        address indexed recipient,
        bytes32 indexed courseId,
        uint256 completionDate,
        uint8 grade,
        uint256 creditsEarned
    );

    event CreditsAwarded(
        address indexed student,
        uint256 amount,
        bytes32 indexed courseId
    );

    event UniversityAuthorized(address indexed university, bool status);
    
    constructor(
        address _courseCatalog,
        address _eduToken
    ) ERC721("EduLink Certificate", "EDU") Ownable(msg.sender) {
        courseCatalog = CourseCatalog(_courseCatalog);
        eduToken = IERC20(_eduToken);
    }

    modifier onlyAuthorizedUniversity() {
        require(authorizedUniversities[msg.sender], "Not authorized university");
        _;
    }

    function authorizeUniversity(address university, bool status) external onlyOwner {
        authorizedUniversities[university] = status;
        emit UniversityAuthorized(university, status);
    }

    function safeMint(
        address to,
        bytes32 courseId,
        uint8 grade,
        uint256 credits,
        string memory uri
    ) public onlyAuthorizedUniversity {
        // Verify course exists in catalog
        (,,,,,bool isActive) = courseCatalog.getCourse(courseId);
        require(isActive, "Course not found in catalog");
        
        uint256 tokenId = _nextTokenId++;
        
        certificates[tokenId] = Certificate({
            courseId: courseId,
            completionDate: block.timestamp,
            recipient: to,
            grade: grade,
            isVerified: true,
            creditsEarned: credits
        });
        
        completedCourses[to][courseId] = true;
        studentCertificates[to].push(tokenId);
        
        // Update education history
        EducationChain storage history = educationHistory[to];
        history.certificateIds.push(tokenId);
        history.totalCredits += credits;
        
        // Award credits as ERC20 tokens
        require(eduToken.transfer(to, credits), "Credit transfer failed");
        
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        
        emit CertificateMinted(
            tokenId,
            to,
            courseId,
            block.timestamp,
            grade,
            credits
        );
        
        emit CreditsAwarded(to, credits, courseId);
    }

    function getEducationHistory(address student) 
        external 
        view 
        returns (
            uint256[] memory certificateIds,
            uint256 totalCredits,
            string[] memory specializations
        ) 
    {
        EducationChain memory history = educationHistory[student];
        return (
            history.certificateIds,
            history.totalCredits,
            history.specializations
        );
    }

    function addSpecialization(address student, string memory specialization) 
        external 
        onlyAuthorizedUniversity 
    {
        educationHistory[student].specializations.push(specialization);
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
            bool isVerified,
            uint256 creditsEarned
        ) 
    {
        require(_exists(tokenId), "Certificate does not exist");
        Certificate memory cert = certificates[tokenId];
        return (
            cert.courseId,
            cert.completionDate,
            cert.recipient,
            cert.grade,
            cert.isVerified,
            cert.creditsEarned
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