const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CourseCatalog", function () {
    let CourseCatalog;
    let courseCatalog;
    let owner;
    let university;
    let addrs;

    beforeEach(async function () {
        // Get signers for different roles
        [owner, university, ...addrs] = await ethers.getSigners();

        // Deploy CourseCatalog
        const CourseCatalogFactory = await ethers.getContractFactory("CourseCatalog");
        courseCatalog = await CourseCatalogFactory.deploy();
    });

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            expect(await courseCatalog.owner()).to.equal(owner.address);
        });
    });

    describe("University Management", function () {
        const universityName = "Test University";
        let universityId;

        beforeEach(async function () {
            universityId = ethers.id(universityName);
        });

        it("Should add a university", async function () {
            await courseCatalog.addUniversity(universityName);
            const university = await courseCatalog.universities(universityId);
            expect(university.name).to.equal(universityName);
            expect(university.isVerified).to.equal(true);
        });

        it("Should emit UniversityAdded event", async function () {
            await expect(courseCatalog.addUniversity(universityName))
                .to.emit(courseCatalog, "UniversityAdded")
                .withArgs(universityId, universityName);
        });

        it("Should not allow adding duplicate university", async function () {
            await courseCatalog.addUniversity(universityName);
            await expect(courseCatalog.addUniversity(universityName))
                .to.be.revertedWith("University exists");
        });

        it("Should only allow owner to add university", async function () {
            await expect(courseCatalog.connect(university).addUniversity(universityName))
                .to.be.revertedWithCustomError(courseCatalog, "OwnableUnauthorizedAccount");
        });
    });

    describe("Course Management", function () {
        const universityName = "Test University";
        const courseCode = "CS101";
        const courseName = "Introduction to Computer Science";
        const credits = 3;
        const metadataURI = "ipfs://metadata";
        let universityId;
        let courseId;

        beforeEach(async function () {
            // Add university first
            await courseCatalog.addUniversity(universityName);
            universityId = ethers.id(universityName);
            courseId = ethers.solidityPackedKeccak256(
                ["string", "bytes32"],
                [courseCode, universityId]
            );
        });

        it("Should add a course", async function () {
            await courseCatalog.addCourse(
                courseCode,
                courseName,
                credits,
                universityId,
                metadataURI
            );

            const course = await courseCatalog.getCourse(courseId);
            expect(course.name).to.equal(courseName);
            expect(course.credits).to.equal(credits);
            expect(course.universityId).to.equal(universityId);
            expect(course.isActive).to.equal(true);
        });

        it("Should emit CourseAdded event", async function () {
            await expect(courseCatalog.addCourse(
                courseCode,
                courseName,
                credits,
                universityId,
                metadataURI
            )).to.emit(courseCatalog, "CourseAdded")
                .withArgs(courseId, courseName, universityId);
        });

        it("Should not allow adding course for unverified university", async function () {
            const fakeUniversityId = ethers.encodeBytes32String("FAKE");
            await expect(courseCatalog.addCourse(
                courseCode,
                courseName,
                credits,
                fakeUniversityId,
                metadataURI
            )).to.be.revertedWith("Invalid university");
        });

        it("Should not allow adding duplicate course", async function () {
            await courseCatalog.addCourse(
                courseCode,
                courseName,
                credits,
                universityId,
                metadataURI
            );

            await expect(courseCatalog.addCourse(
                courseCode,
                courseName,
                credits,
                universityId,
                metadataURI
            )).to.be.revertedWith("Course exists");
        });
    });

    describe("Prerequisites Management", function () {
        let courseId1;
        let courseId2;

        beforeEach(async function () {
            // Add university
            const universityName = "Test University";
            await courseCatalog.addUniversity(universityName);
            const universityId = ethers.id(universityName);

            // Generate course IDs
            courseId1 = ethers.solidityPackedKeccak256(
                ["string", "bytes32"],
                ["CS101", universityId]
            );
            courseId2 = ethers.solidityPackedKeccak256(
                ["string", "bytes32"],
                ["CS102", universityId]
            );

            // Add two courses
            await courseCatalog.addCourse(
                "CS101",
                "Intro to CS",
                3,
                universityId,
                "uri1"
            );
            await courseCatalog.addCourse(
                "CS102",
                "Advanced CS",
                3,
                universityId,
                "uri2"
            );
        });

        it("Should add prerequisite", async function () {
            await courseCatalog.addPrerequisite(courseId2, courseId1);
            expect(await courseCatalog.prerequisiteGraph(courseId2, courseId1)).to.equal(true);
        });

        it("Should emit PrerequisiteAdded event", async function () {
            await expect(courseCatalog.addPrerequisite(courseId2, courseId1))
                .to.emit(courseCatalog, "PrerequisiteAdded")
                .withArgs(courseId2, courseId1);
        });

        it("Should not allow adding prerequisite for non-existent course", async function () {
            const fakeCourseId = ethers.id("FAKE");
            await expect(courseCatalog.addPrerequisite(fakeCourseId, courseId1))
                .to.be.revertedWith("Course not found");
        });

        it("Should not allow adding duplicate prerequisite", async function () {
            await courseCatalog.addPrerequisite(courseId2, courseId1);
            await expect(courseCatalog.addPrerequisite(courseId2, courseId1))
                .to.be.revertedWith("Prerequisite exists");
        });

        it("Should validate prerequisites correctly", async function () {
            await courseCatalog.addPrerequisite(courseId2, courseId1);
            
            // Test with completed prerequisites
            expect(await courseCatalog.validatePrerequisites(courseId2, [courseId1]))
                .to.equal(true);

            // Test with missing prerequisites
            expect(await courseCatalog.validatePrerequisites(courseId2, []))
                .to.equal(false);
        });
    });

    describe("Course Queries", function () {
        let universityId;
        let courseId;

        beforeEach(async function () {
            // Add university first
            const universityName = "Test University";
            await courseCatalog.addUniversity(universityName);
            universityId = ethers.id(universityName);
            
            // Generate course ID
            courseId = ethers.solidityPackedKeccak256(
                ["string", "bytes32"],
                ["CS101", universityId]
            );

            // Add course
            await courseCatalog.addCourse(
                "CS101",
                "Intro to CS",
                3,
                universityId,
                "ipfs://metadata"
            );
        });

        it("Should retrieve course details correctly", async function () {
            const course = await courseCatalog.getCourse(courseId);
            expect(course.name).to.equal("Intro to CS");
            expect(course.credits).to.equal(3);
            expect(course.universityId).to.equal(universityId);
            expect(course.prerequisites).to.deep.equal([]);
            expect(course.isActive).to.equal(true);
        });

        it("Should fail to retrieve non-existent course", async function () {
            const fakeCourseId = ethers.id("FAKE");
            await expect(courseCatalog.getCourse(fakeCourseId))
                .to.be.revertedWith("Course not found");
        });
    });
});
