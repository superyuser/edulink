const { expect } = require("chai");
const { ethers } = require("hardhat");
const {
    deployContracts,
    setupUniversity,
    setupCourse,
    generateCourseId
} = require("./helpers");

describe("Integration Tests", function () {
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
    let courseId1;
    let courseId2;

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

        // Setup test university
        const universityName = "Test University";
        universityId = await setupUniversity(courseCatalog, universityName);

        // Setup test courses with prerequisites
        courseId1 = await setupCourse(
            courseCatalog,
            "CS101",
            "Introduction to Computer Science",
            3,
            universityId
        );

        courseId2 = await setupCourse(
            courseCatalog,
            "CS102",
            "Advanced Programming",
            3,
            universityId
        );

        // Set CS101 as prerequisite for CS102
        await courseCatalog.addPrerequisite(courseId2, courseId1);
    });

    describe("Complete Educational Flow", function () {
        it("Should complete full flow: authorize agent -> complete basic course -> complete advanced course", async function () {
            // 1. Authorize agent
            await agentManager.authorizeAgent(agent.address);
            expect(await agentManager.isAuthorizedAgent(agent.address)).to.be.true;

            // 2. Complete CS101 (basic course)
            const grade1 = 85;
            const credits1 = 3;
            const uri1 = "ipfs://basic-course";

            // Initial balances
            const initialStudentBalance = await eduToken.balanceOf(student.address);
            
            // Request certificate for CS101
            await agentManager
                .connect(agent)
                .requestCertificate(
                    student.address,
                    courseId1,
                    grade1,
                    credits1,
                    uri1
                );

            // Verify certificate was minted
            expect(await certificateNFT.balanceOf(student.address)).to.equal(1);
            
            // Verify student received credits as tokens
            const afterCS101Balance = await eduToken.balanceOf(student.address);
            const expectedTokens1 = ethers.parseUnits(credits1.toString(), 18);
            expect(afterCS101Balance - initialStudentBalance).to.equal(expectedTokens1);

            // Verify course completion status
            expect(await certificateNFT.hasCompletedCourse(student.address, courseId1)).to.be.true;

            // 3. Complete CS102 (advanced course)
            const grade2 = 90;
            const credits2 = 3;
            const uri2 = "ipfs://advanced-course";

            // Get completed courses
            const studentCompletedCourses = [courseId1];
            // Verify prerequisites are met
            expect(await courseCatalog.validatePrerequisites(courseId2, studentCompletedCourses)).to.be.true;

            // Request certificate for CS102
            await agentManager
                .connect(agent)
                .requestCertificate(
                    student.address,
                    courseId2,
                    grade2,
                    credits2,
                    uri2
                );

            // Verify certificate was minted
            expect(await certificateNFT.balanceOf(student.address)).to.equal(2);

            // Verify student received additional credits
            const finalBalance = await eduToken.balanceOf(student.address);
            const expectedTokens2 = ethers.parseUnits(credits2.toString(), 18);
            expect(finalBalance - afterCS101Balance).to.equal(expectedTokens2);

            // Get student certificates
            const studentCerts = await certificateNFT.getStudentCertificates(student.address);
            expect(studentCerts.length).to.equal(2);

            // Verify certificates
            const cert1 = await certificateNFT.getCertificate(studentCerts[0]);
            expect(cert1.courseId).to.equal(courseId1);
            expect(cert1.grade).to.equal(grade1);
            expect(cert1.creditsEarned).to.equal(credits1);

            const cert2 = await certificateNFT.getCertificate(studentCerts[1]);
            expect(cert2.courseId).to.equal(courseId2);
            expect(cert2.grade).to.equal(grade2);
            expect(cert2.creditsEarned).to.equal(credits2);

            // Add a specialization
            const specialization = "Computer Science";
            await certificateNFT.connect(university).addSpecialization(student.address, specialization);

            // Verify education history
            const [certificateIds, totalCredits, specializations] = await certificateNFT.getEducationHistory(student.address);
            expect(certificateIds.length).to.equal(2);
            expect(totalCredits).to.equal(credits1 + credits2);
            expect(specializations.length).to.equal(1);
            expect(specializations[0]).to.equal(specialization);
        });

        it("Should not allow completing advanced course without prerequisites", async function () {
            // Authorize agent
            await agentManager.authorizeAgent(agent.address);

            // Try to complete CS102 without completing CS101
            const grade = 90;
            const credits = 3;
            const uri = "ipfs://advanced-course";

            // Verify prerequisites are not met with empty completed courses
            const emptyCompletedCourses = [];
            expect(await courseCatalog.validatePrerequisites(courseId2, emptyCompletedCourses)).to.be.false;

            // Attempt to request certificate should fail
            await expect(
                agentManager
                    .connect(agent)
                    .requestCertificate(
                        student.address,
                        courseId2,
                        grade,
                        credits,
                        uri
                    )
            ).to.be.revertedWith("Prerequisites not met");
        });

        it("Should handle multiple agents and students", async function () {
            const [agent2, student2] = others.slice(1);
            
            // Authorize both agents
            await agentManager.authorizeAgent(agent.address);
            await agentManager.authorizeAgent(agent2.address);

            // Complete CS101 for both students using different agents
            const grade = 85;
            const credits = 3;
            const uri1 = "ipfs://student1";
            const uri2 = "ipfs://student2";

            // First student with first agent
            await agentManager
                .connect(agent)
                .requestCertificate(
                    student.address,
                    courseId1,
                    grade,
                    credits,
                    uri1
                );

            // Second student with second agent
            await agentManager
                .connect(agent2)
                .requestCertificate(
                    student2.address,
                    courseId1,
                    grade,
                    credits,
                    uri2
                );

            // Verify certificates for both students
            expect(await certificateNFT.balanceOf(student.address)).to.equal(1);
            expect(await certificateNFT.balanceOf(student2.address)).to.equal(1);

            // Verify course completion for both students
            expect(await certificateNFT.hasCompletedCourse(student.address, courseId1)).to.be.true;
            expect(await certificateNFT.hasCompletedCourse(student2.address, courseId1)).to.be.true;
        });

        it("Should handle certificate verification and token distribution", async function () {
            // Authorize agent
            await agentManager.authorizeAgent(agent.address);

            // Complete course
            const grade = 85;
            const credits = 3;
            const uri = "ipfs://test-course";

            // Get initial balances
            const initialStudentBalance = await eduToken.balanceOf(student.address);
            const initialCertificateNFTBalance = await eduToken.balanceOf(await certificateNFT.getAddress());

            // Request and verify certificate
            await agentManager
                .connect(agent)
                .requestCertificate(
                    student.address,
                    courseId1,
                    grade,
                    credits,
                    uri
                );

            // Get certificate ID
            const studentCerts = await certificateNFT.getStudentCertificates(student.address);
            const tokenId = studentCerts[0];

            // Verify certificate
            await agentManager.connect(agent).verifyCertificate(tokenId);

            // Check certificate status
            const [,,,,isVerified,] = await certificateNFT.getCertificate(tokenId);
            expect(isVerified).to.be.true;

            // Verify token distribution
            const finalStudentBalance = await eduToken.balanceOf(student.address);
            const finalCertificateNFTBalance = await eduToken.balanceOf(await certificateNFT.getAddress());

            const expectedTokens = ethers.parseUnits(credits.toString(), 18);
            expect(finalStudentBalance - initialStudentBalance).to.equal(expectedTokens);
            expect(initialCertificateNFTBalance - finalCertificateNFTBalance).to.equal(expectedTokens);
        });
    });
});
