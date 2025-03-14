const { expect } = require("chai");
const { ethers } = require("hardhat");
const {
    deployContracts,
    setupUniversity,
    setupCourse,
    generateCourseId
} = require("./helpers");

describe("AgentManager", function () {
    let eduToken;
    let courseCatalog;
    let certificateNFT;
    let agentManager;
    let owner;
    let university;
    let student;
    let agent;
    let others;
    let universityId;
    let courseId;

    beforeEach(async function () {
        // Deploy all contracts and get signers
        ({
            eduToken,
            courseCatalog,
            certificateNFT,
            agentManager,
            owner,
            university,
            student,
            others
        } = await deployContracts());

        // Get agent signer
        [agent] = others;

        // Setup test university and course
        const universityName = "Test University";
        universityId = await setupUniversity(courseCatalog, universityName);
        courseId = await setupCourse(
            courseCatalog,
            "CS101",
            "Introduction to Computer Science",
            3,
            universityId
        );
    });

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            expect(await agentManager.owner()).to.equal(owner.address);
        });

        it("Should set the correct certificate contract", async function () {
            expect(await agentManager.certificateContract()).to.equal(
                await certificateNFT.getAddress()
            );
        });
    });

    describe("Agent Management", function () {
        it("Should authorize an agent", async function () {
            await agentManager.authorizeAgent(agent.address);
            expect(await agentManager.isAuthorizedAgent(agent.address)).to.be.true;
        });

        it("Should emit AgentAuthorized event", async function () {
            await expect(agentManager.authorizeAgent(agent.address))
                .to.emit(agentManager, "AgentAuthorized")
                .withArgs(agent.address);
        });

        it("Should revoke an agent", async function () {
            await agentManager.authorizeAgent(agent.address);
            await agentManager.revokeAgent(agent.address);
            expect(await agentManager.isAuthorizedAgent(agent.address)).to.be.false;
        });

        it("Should emit AgentRevoked event", async function () {
            await agentManager.authorizeAgent(agent.address);
            await expect(agentManager.revokeAgent(agent.address))
                .to.emit(agentManager, "AgentRevoked")
                .withArgs(agent.address);
        });

        it("Should only allow owner to authorize agents", async function () {
            await expect(
                agentManager.connect(agent).authorizeAgent(others[1].address)
            ).to.be.revertedWithCustomError(
                agentManager,
                "OwnableUnauthorizedAccount"
            );
        });

        it("Should only allow owner to revoke agents", async function () {
            await agentManager.authorizeAgent(agent.address);
            await expect(
                agentManager.connect(agent).revokeAgent(agent.address)
            ).to.be.revertedWithCustomError(
                agentManager,
                "OwnableUnauthorizedAccount"
            );
        });
    });

    describe("Certificate Management", function () {
        const grade = 85;
        const credits = 3;
        const metadataURI = "ipfs://metadata";

        beforeEach(async function () {
            // Authorize agent
            await agentManager.authorizeAgent(agent.address);
        });

        it("Should allow authorized agent to request certificate", async function () {
            await expect(
                agentManager
                    .connect(agent)
                    .requestCertificate(
                        student.address,
                        courseId,
                        grade,
                        credits,
                        metadataURI
                    )
            )
                .to.emit(agentManager, "CertificateRequested")
                .withArgs(
                    student.address,
                    courseId,
                    grade,
                    credits,
                    metadataURI
                );
        });

        it("Should mint certificate through CertificateNFT contract", async function () {
            await agentManager
                .connect(agent)
                .requestCertificate(
                    student.address,
                    courseId,
                    grade,
                    credits,
                    metadataURI
                );

            // Check if certificate was minted
            expect(await certificateNFT.balanceOf(student.address)).to.equal(1);
        });

        it("Should not allow unauthorized agents to request certificates", async function () {
            await expect(
                agentManager
                    .connect(others[1])
                    .requestCertificate(
                        student.address,
                        courseId,
                        grade,
                        credits,
                        metadataURI
                    )
            ).to.be.revertedWith("Not authorized");
        });

        it("Should allow authorized agent to verify certificate", async function () {
            // First mint a certificate
            await agentManager
                .connect(agent)
                .requestCertificate(
                    student.address,
                    courseId,
                    grade,
                    credits,
                    metadataURI
                );

            const tokenId = 0; // First token minted
            await agentManager.connect(agent).verifyCertificate(tokenId);

            // Check if certificate is verified
            const [,,,,isVerified,] = await certificateNFT.getCertificate(tokenId);
            expect(isVerified).to.be.true;
        });

        it("Should not allow unauthorized agents to verify certificates", async function () {
            // First mint a certificate
            await agentManager
                .connect(agent)
                .requestCertificate(
                    student.address,
                    courseId,
                    grade,
                    credits,
                    metadataURI
                );

            const tokenId = 0; // First token minted
            await expect(
                agentManager.connect(others[1]).verifyCertificate(tokenId)
            ).to.be.revertedWith("Not authorized");
        });
    });

    describe("View Functions", function () {
        it("Should correctly report agent status", async function () {
            expect(await agentManager.isAuthorizedAgent(agent.address)).to.be.false;
            await agentManager.authorizeAgent(agent.address);
            expect(await agentManager.isAuthorizedAgent(agent.address)).to.be.true;
            await agentManager.revokeAgent(agent.address);
            expect(await agentManager.isAuthorizedAgent(agent.address)).to.be.false;
        });

        it("Should consider owner as authorized agent", async function () {
            expect(await agentManager.isAuthorizedAgent(owner.address)).to.be.true;
        });
    });
});
