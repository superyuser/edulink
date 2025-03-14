const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CertificateNFT", function () {
    let CertificateNFT;
    let CourseCatalog;
    let EduToken;
    let certificateNFT;
    let courseCatalog;
    let eduToken;
    let owner;
    let university;
    let student;
    let addrs;

    beforeEach(async function () {
        // Get signers for different roles
        [owner, university, student, ...addrs] = await ethers.getSigners();

        // Deploy EduToken (mock ERC20)
        const EduTokenFactory = await ethers.getContractFactory("EduToken");
        eduToken = await EduTokenFactory.deploy();

        // Deploy CourseCatalog
        const CourseCatalogFactory = await ethers.getContractFactory("CourseCatalog");
        courseCatalog = await CourseCatalogFactory.deploy();

        // Deploy CertificateNFT
        const CertificateNFTFactory = await ethers.getContractFactory("CertificateNFT");
        certificateNFT = await CertificateNFTFactory.deploy(
            await courseCatalog.getAddress(),
            await eduToken.getAddress()
        );

        // Setup initial state
        await eduToken.transfer(await certificateNFT.getAddress(), ethers.parseEther("1000")); // Initial token supply
        await certificateNFT.authorizeUniversity(await university.getAddress(), true);

        // Add test university to course catalog
        const universityName = "Test University";
        const universityId = ethers.id(universityName);
        await courseCatalog.addUniversity(universityName);
    });

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            expect(await certificateNFT.owner()).to.equal(owner.address);
        });

        it("Should set the correct CourseCatalog address", async function () {
            expect(await certificateNFT.courseCatalog()).to.equal(await courseCatalog.getAddress());
        });

        it("Should set the correct EduToken address", async function () {
            expect(await certificateNFT.eduToken()).to.equal(await eduToken.getAddress());
        });
    });

    describe("University Authorization", function () {
        it("Should authorize a university", async function () {
            const newUniversity = addrs[0];
            await certificateNFT.authorizeUniversity(await newUniversity.getAddress(), true);
            expect(await certificateNFT.authorizedUniversities(await newUniversity.getAddress())).to.equal(true);
        });

        it("Should revoke university authorization", async function () {
            await certificateNFT.authorizeUniversity(await university.getAddress(), false);
            expect(await certificateNFT.authorizedUniversities(await university.getAddress())).to.equal(false);
        });

        it("Should emit UniversityAuthorized event", async function () {
            const newUniversity = addrs[0];
            await expect(certificateNFT.authorizeUniversity(await newUniversity.getAddress(), true))
                .to.emit(certificateNFT, "UniversityAuthorized")
                .withArgs(await newUniversity.getAddress(), true);
        });

        it("Should only allow owner to authorize universities", async function () {
            const newUniversity = addrs[0];
            await expect(
                certificateNFT.connect(university).authorizeUniversity(await newUniversity.getAddress(), true)
            ).to.be.revertedWithCustomError(certificateNFT, "OwnableUnauthorizedAccount");
        });
    });

    describe("Certificate Minting", function () {
        let courseId;
        const grade = 85;
        const credits = 3;
        const uri = "ipfs://QmTest";

        beforeEach(async function () {
            // Add a course to catalog first
            const courseName = "Test Course";
            const courseCode = "TEST101";
            const universityId = ethers.id("Test University");
            
            // Generate course ID using the same method as CourseCatalog
            courseId = ethers.solidityPackedKeccak256(
                ["string", "bytes32"],
                [courseCode, universityId]
            );

            // Add course to catalog
            await courseCatalog.addCourse(
                courseCode,
                courseName,
                credits,
                universityId,
                "ipfs://metadata"
            );
        });

        it("Should mint a certificate", async function () {

            
            await certificateNFT.connect(university).safeMint(
                await student.getAddress(),
                courseId,
                grade,
                credits,
                uri
            );

            expect(await certificateNFT.balanceOf(await student.getAddress())).to.equal(1);
            const tokenId = 0; // First token
            expect(await certificateNFT.ownerOf(tokenId)).to.equal(await student.getAddress());
        });

        it("Should store correct certificate data", async function () {
            await certificateNFT.connect(university).safeMint(
                await student.getAddress(),
                courseId,
                grade,
                credits,
                uri
            );

            const cert = await certificateNFT.getCertificate(0);
            expect(cert.courseId).to.equal(courseId);
            expect(cert.grade).to.equal(grade);
            expect(cert.creditsEarned).to.equal(credits);
            expect(cert.recipient).to.equal(student.address);
            expect(cert.isVerified).to.equal(true);
        });

        it("Should emit CertificateMinted event", async function () {

            
            await expect(certificateNFT.connect(university).safeMint(
                await student.getAddress(),
                courseId,
                grade,
                credits,
                uri
            )).to.emit(certificateNFT, "CertificateMinted");
        });

        it("Should only allow authorized universities to mint", async function () {
            const unauthorizedUniversity = addrs[0];
            await expect(
                certificateNFT.connect(unauthorizedUniversity).safeMint(
                    await student.getAddress(),
                    courseId,
                    grade,
                    credits,
                    uri
                )
            ).to.be.revertedWith("Not authorized university");
        });
    });

    describe("Education History", function () {
        it("Should track education history correctly", async function () {
            // Generate course IDs using the same method as CourseCatalog
            const universityId = ethers.id("Test University");
            const courseId1 = ethers.solidityPackedKeccak256(
                ["string", "bytes32"],
                ["COURSE1", universityId]
            );
            const courseId2 = ethers.solidityPackedKeccak256(
                ["string", "bytes32"],
                ["COURSE2", universityId]
            );
            
            // Add courses to catalog
            await courseCatalog.addCourse(
                "COURSE1",
                "Test Course 1",
                3,
                universityId,
                "ipfs://metadata1"
            );
            await courseCatalog.addCourse(
                "COURSE2",
                "Test Course 2",
                4,
                universityId,
                "ipfs://metadata2"
            );
            
            await certificateNFT.connect(university).safeMint(
                await student.getAddress(),
                courseId1,
                85,
                3,
                "uri1"
            );

            await certificateNFT.connect(university).safeMint(
                await student.getAddress(),
                courseId2,
                90,
                4,
                "uri2"
            );

            const history = await certificateNFT.getEducationHistory(await student.getAddress());
            expect(history.certificateIds.length).to.equal(2);
            expect(history.totalCredits).to.equal(7); // 3 + 4 credits
        });

        it("Should add specialization correctly", async function () {
            const specialization = "Computer Science";
            await certificateNFT.connect(university).addSpecialization(
                await student.getAddress(),
                specialization
            );

            const history = await certificateNFT.getEducationHistory(await student.getAddress());
            expect(history.specializations[0]).to.equal(specialization);
        });
    });

    describe("Certificate Verification", function () {
        it("Should verify a certificate", async function () {
            const universityId = ethers.id("Test University");
            const courseId = ethers.solidityPackedKeccak256(
                ["string", "bytes32"],
                ["COURSE1", universityId]
            );
            
            // Add course to catalog
            await courseCatalog.addCourse(
                "COURSE1",
                "Test Course",
                3,
                universityId,
                "ipfs://metadata"
            );
            
            await certificateNFT.connect(university).safeMint(
                await student.getAddress(),
                courseId,
                85,
                3,
                "uri"
            );

            await certificateNFT.authorizeUniversity(owner.address, true);
            await certificateNFT.verifyCertificate(0);
            const cert = await certificateNFT.getCertificate(0);
            expect(cert.isVerified).to.equal(true);
        });

        it("Should emit CertificateVerified event", async function () {
            const universityId = ethers.id("Test University");
            const courseId = ethers.solidityPackedKeccak256(
                ["string", "bytes32"],
                ["COURSE1", universityId]
            );
            
            // Add course to catalog
            await courseCatalog.addCourse(
                "COURSE1",
                "Test Course",
                3,
                universityId,
                "ipfs://metadata"
            );
            
            await certificateNFT.connect(university).safeMint(
                await student.getAddress(),
                courseId,
                85,
                3,
                "uri"
            );

            await certificateNFT.authorizeUniversity(owner.address, true);
            await expect(certificateNFT.verifyCertificate(0))
                .to.emit(certificateNFT, "CertificateVerified")
                .withArgs(0, await owner.getAddress());
        });
    });

    describe("Course Completion Checks", function () {
        it("Should correctly track completed courses", async function () {
            const universityId = ethers.id("Test University");
            const courseId = ethers.solidityPackedKeccak256(
                ["string", "bytes32"],
                ["COURSE1", universityId]
            );
            
            // Add course to catalog
            await courseCatalog.addCourse(
                "COURSE1",
                "Test Course",
                3,
                universityId,
                "ipfs://metadata"
            );
            
            await certificateNFT.connect(university).safeMint(
                await student.getAddress(),
                courseId,
                85,
                3,
                "uri"
            );

            expect(await certificateNFT.hasCompletedCourse(await student.getAddress(), courseId))
                .to.equal(true);
        });

        it("Should return false for uncompleted courses", async function () {
            const universityId = ethers.id("Test University");
            const courseId = ethers.solidityPackedKeccak256(
                ["string", "bytes32"],
                ["COURSE1", universityId]
            );
            expect(await certificateNFT.hasCompletedCourse(await student.getAddress(), courseId))
                .to.equal(false);
        });
    });
});
