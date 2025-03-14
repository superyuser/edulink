// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract CourseCatalog is Ownable {
    // Struct definitions
    struct Course {
        bytes32 courseId;    // Hashed course ID for gas efficiency
        string name;
        uint8 credits;
        bytes32 universityId;  // Hashed university ID
        bytes32[] prerequisites;
        bytes32 metadataURI;   // IPFS hash for extended course data
        bool isActive;
    }

    struct University {
        bytes32 id;
        string name;
        bool isVerified;
    }

    // Storage
    mapping(bytes32 => Course) public courses;
    mapping(bytes32 => University) public universities;
    mapping(bytes32 => mapping(bytes32 => bool)) public prerequisiteGraph; // Hashed course ID for gas efficiency
    
    // Events
    event CourseAdded(bytes32 indexed courseId, string name, bytes32 indexed universityId);
    event CourseUpdated(bytes32 indexed courseId);
    event UniversityAdded(bytes32 indexed id, string name);
    event PrerequisiteAdded(bytes32 indexed courseId, bytes32 indexed prerequisiteId);

    constructor() Ownable(msg.sender) {}

    // University Management
    function addUniversity(string memory name) external onlyOwner {
        bytes32 universityId = keccak256(abi.encodePacked(name));
        require(!universities[universityId].isVerified, "University exists");
        
        universities[universityId] = University({
            id: universityId,
            name: name,
            isVerified: true
        });
        
        emit UniversityAdded(universityId, name);
    }

    // Course Management
    function addCourse(
        string memory courseCode,
        string memory name,
        uint8 credits,
        bytes32 universityId,
        string memory metadataURI
    ) external onlyOwner {
        require(universities[universityId].isVerified, "Invalid university");
        
        bytes32 courseId = keccak256(abi.encodePacked(courseCode, universityId));
        require(!courses[courseId].isActive, "Course exists");

        courses[courseId] = Course({
            courseId: courseId,
            name: name,
            credits: credits,
            universityId: universityId,
            prerequisites: new bytes32[](0),
            metadataURI: keccak256(abi.encodePacked(metadataURI)),
            isActive: true
        });

        emit CourseAdded(courseId, name, universityId);
    }

    function addPrerequisite(bytes32 courseId, bytes32 prerequisiteId) external onlyOwner {
        require(courses[courseId].isActive, "Course not found");
        require(courses[prerequisiteId].isActive, "Prerequisite not found");
        require(!prerequisiteGraph[courseId][prerequisiteId], "Prerequisite exists");

        prerequisiteGraph[courseId][prerequisiteId] = true;
        courses[courseId].prerequisites.push(prerequisiteId);
        
        emit PrerequisiteAdded(courseId, prerequisiteId);
    }

    // View Functions
    function getCourse(bytes32 courseId) external view returns (
        string memory name,
        uint8 credits,
        bytes32 universityId,
        bytes32[] memory prerequisites,
        bytes32 metadataURI,
        bool isActive
    ) {
        Course memory course = courses[courseId];
        require(course.isActive, "Course not found");
        
        return (
            course.name,
            course.credits,
            course.universityId,
            course.prerequisites,
            course.metadataURI,
            course.isActive
        );
    }

    function validatePrerequisites(bytes32 courseId, bytes32[] calldata completedCourses) 
        external 
        view 
        returns (bool) 
    {
        require(courses[courseId].isActive, "Course not found");
        bytes32[] memory required = courses[courseId].prerequisites;
        for (uint i = 0; i < required.length; i++) {
            bool found = false;
            for (uint j = 0; j < completedCourses.length; j++) {
                if (required[i] == completedCourses[j]) {
                    found = true;
                    break;
                }
            }
            if (!found) return false;
        }
        return true;
    }
}