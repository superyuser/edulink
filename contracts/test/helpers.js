const { ethers } = require("hardhat");

// Helper functions for generating IDs and hashes
const generateUniversityId = (universityName) => {
    return ethers.id(universityName);
};

const generateCourseId = (courseCode, universityId) => {
    return ethers.solidityPackedKeccak256(
        ["string", "bytes32"],
        [courseCode, universityId]
    );
};

// Helper functions for contract deployment
async function deployContracts() {
    const [owner, university, student, ...others] = await ethers.getSigners();

    // Deploy EduToken
    const EduToken = await ethers.getContractFactory("EduToken");
    const eduToken = await EduToken.deploy();

    // Deploy CourseCatalog
    const CourseCatalog = await ethers.getContractFactory("CourseCatalog");
    const courseCatalog = await CourseCatalog.deploy();

    // Deploy CertificateNFT
    const CertificateNFT = await ethers.getContractFactory("CertificateNFT");
    const certificateNFT = await CertificateNFT.deploy(
        await courseCatalog.getAddress(),
        await eduToken.getAddress()
    );

    // Deploy AgentManager
    const AgentManager = await ethers.getContractFactory("AgentManager");
    const agentManager = await AgentManager.deploy(
        await certificateNFT.getAddress()
    );

    // Authorize university and agent manager
    await certificateNFT.authorizeUniversity(university.address, true);
    await certificateNFT.authorizeUniversity(await agentManager.getAddress(), true);

    // Transfer EduTokens to CertificateNFT for minting rewards
    await eduToken.transfer(await certificateNFT.getAddress(), ethers.parseUnits("10000", 18));

    return {
        eduToken,
        courseCatalog,
        certificateNFT,
        agentManager,
        owner,
        university,
        student,
        others
    };
}

// Helper functions for test setup
async function setupUniversity(courseCatalog, universityName) {
    const universityId = generateUniversityId(universityName);
    await courseCatalog.addUniversity(universityName);
    return universityId;
}

async function setupCourse(courseCatalog, courseCode, courseName, credits, universityId) {
    const courseId = generateCourseId(courseCode, universityId);
    await courseCatalog.addCourse(
        courseCode,
        courseName,
        credits,
        universityId,
        "ipfs://metadata"
    );
    return courseId;
}

module.exports = {
    generateUniversityId,
    generateCourseId,
    deployContracts,
    setupUniversity,
    setupCourse
};
