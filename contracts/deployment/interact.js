const hre = require("hardhat");

async function main() {
    // Contract addresses from deployment (subject to change)
    const eduTokenAddress = "0x803415c7d4454D20A7490cC16aD83e06A96B0127";
    const courseCatalogAddress = "0x87787F9D5007e9f8c813555D84F391245018f953";
    const certificateNFTAddress = "0xCfC5c0aadB552b69E9126E26aA25B55Ebb0Dae8c";
    const agentManagerAddress = "0xEa0768354525cbCdA1c148bAfBF81ba67924a0cE";

    // Get contract factories
    const EduToken = await hre.ethers.getContractFactory("EduToken");
    const CourseCatalog = await hre.ethers.getContractFactory("CourseCatalog");
    const CertificateNFT = await hre.ethers.getContractFactory("CertificateNFT");
    const AgentManager = await hre.ethers.getContractFactory("AgentManager");

    // Get contract instances
    const eduToken = EduToken.attach(eduTokenAddress);
    const courseCatalog = CourseCatalog.attach(courseCatalogAddress);
    const certificateNFT = CertificateNFT.attach(certificateNFTAddress);
    const agentManager = AgentManager.attach(agentManagerAddress);

    // Get signer
    const [signer] = await hre.ethers.getSigners();
    console.log("Interacting with contracts using account:", signer.address);

    // Function to check EduToken balance
    async function checkEduTokenBalance() {
        const balance = await eduToken.balanceOf(signer.address);
        console.log(`EduToken Balance: ${balance.toString()}`);
    }

    // Function to check certificate details
    async function checkCertificateDetails(tokenId) {
        const certDetails = await certificateNFT.getCertificate(tokenId);
        console.log(`Certificate Details for Token ID ${tokenId}:`);
        console.log(`Course ID: ${certDetails.courseId}`);
        console.log(`Completion Date: ${new Date(certDetails.completionDate * 1000).toISOString()}`);
        console.log(`Recipient: ${certDetails.recipient}`);
        console.log(`Grade: ${certDetails.grade}`);
        console.log(`Is Verified: ${certDetails.isVerified}`);
        console.log(`Credits Earned: ${certDetails.creditsEarned}`);
    }

    // 1. Check EduToken balance
    await checkEduTokenBalance();

    // 2. Get course details and manage courses
    const cs101Id = "0x15fc17c92fc4afa158f61e98cb9d8ce90868ded9868c982c16c42b259462f198";
    const universityId = "0x741434c340955a10e26ed89c358fcb67c14af590e04045b42c81f0f5fb0e72d6";
    
    try {
        // Get CS101 details
        const cs101Details = await courseCatalog.getCourse(cs101Id);
        console.log("\nCS101 Course Details:");
        console.log("Name:", cs101Details[0]);
        console.log("Credits:", cs101Details[1].toString());
        console.log("University ID:", cs101Details[2]);
        console.log("Is Active:", cs101Details[5]);

        // Add CS102 course
        const cs102Code = "CS102";
        const cs102Name = "Advanced Programming";
        console.log("\nAdding CS102 to catalog...");
        
        try {
            // Calculate courseId the same way as the contract
            const cs102Id = hre.ethers.keccak256(
                hre.ethers.solidityPacked(["string", "bytes32"], [cs102Code, universityId])
            );
            console.log("CS102 ID:", cs102Id);
            
            try {
                const cs102Details = await courseCatalog.getCourse(cs102Id);
                console.log("\nCS102 already exists:");
                console.log("Name:", cs102Details[0]);
                console.log("Credits:", cs102Details[1].toString());
                console.log("Is Active:", cs102Details[5]);
            } catch {
                const tx = await courseCatalog.addCourse(
                    cs102Code,
                    cs102Name,
                    4,
                    universityId,
                    "https://edulink.edu/courses/cs102"
                );
                await tx.wait();
                console.log("CS102 added successfully");
                
                const cs102Details = await courseCatalog.getCourse(cs102Id);
                console.log("\nVerifying CS102 Course Details:");
                console.log("Name:", cs102Details[0]);
                console.log("Credits:", cs102Details[1].toString());
                console.log("Is Active:", cs102Details[5]);
            }
            
            // Store CS102 ID for later use
            global.cs102Id = cs102Id;
        } catch (error) {
            console.error("Error with CS102:", error.message);
            return;
        }
    } catch (error) {
        console.error("Error managing courses:", error.message);
        return;
    }

    // 3. Check if user is authorized agent
    const isAgent = await agentManager.isAuthorizedAgent(signer.address);
    console.log("\nIs Authorized Agent:", isAgent);

    // 4. Get certificate information
    console.log("\n=== Certificate Information ===");
    try {
        // Check certificate balance using ERC721 balanceOf
        const certBalance = await certificateNFT.balanceOf(signer.address);
        console.log("Your Certificate Balance:", certBalance.toString());

        // Get education history
        const history = await certificateNFT.getEducationHistory(signer.address);
        console.log("\nEducation History:");
        console.log("Total Credits:", history[0].toString());
        console.log("Certificates:", history[1].length);

        // Check CertificateNFT's EduToken balance
        const certNFTBalance = await eduToken.balanceOf(certificateNFTAddress);
        console.log("\nCertificateNFT Contract EduToken Balance:", hre.ethers.formatUnits(certNFTBalance, 18));
    } catch (error) {
        console.error("Error fetching certificate information:", error.message);
    }

    // 5. Check course completion status for CS102
    console.log("\n=== Checking Course Status ===");
    const hasCompletedCS102 = await certificateNFT.hasCompletedCourse(signer.address, cs102Id);
    if (hasCompletedCS102) {
        console.log("You have already completed CS102!");
        return;
    }
    console.log("CS102 not yet completed. Proceeding with certificate minting.");

    // 6. Check university authorization
    console.log("\n=== Checking University Authorization ===");
    const isAuthorizedUniv = await certificateNFT.authorizedUniversities(signer.address);
    if (!isAuthorizedUniv) {
        console.log("Authorizing signer as university...");
        const authTx = await certificateNFT.authorizeUniversity(signer.address, true);
        await authTx.wait();
        console.log("Successfully authorized as university");
    } else {
        console.log("Already authorized as university");
    }

    // 6. Check prerequisites and validate course completion requirements
    console.log("\n=== Checking Course Requirements ===");
    try {
        // Get student's certificates
        const studentCerts = await certificateNFT.getStudentCertificates(signer.address);
        const completedCourses = [];
        
        // Get course IDs from certificates
        for (const tokenId of studentCerts) {
            const cert = await certificateNFT.getCertificate(tokenId);
            completedCourses.push(cert.courseId);
        }
        console.log("Completed courses:", completedCourses);

        // Check prerequisites
        const prereqsMet = await courseCatalog.validatePrerequisites(cs102Id, completedCourses);
        console.log("Prerequisites met:", prereqsMet);
        if (!prereqsMet) {
            console.log("Cannot mint certificate: prerequisites not met");
            return;
        }
    } catch (error) {
        console.error("Error checking prerequisites:", error.message);
        return;
    }

    // 7. Check and manage EduToken balances
    console.log("\n=== Managing Token Balances ===");
    try {
        const contractBalance = await eduToken.balanceOf(certificateNFTAddress);
        const requiredBalance = hre.ethers.parseUnits("4", 18);
        
        console.log("CertificateNFT Contract EduToken Balance:", hre.ethers.formatUnits(contractBalance, 18));
        console.log("Required Balance for Rewards:", hre.ethers.formatUnits(requiredBalance, 18));
        
        const studentBalance = await eduToken.balanceOf(signer.address);
        console.log("Student EduToken Balance:", hre.ethers.formatUnits(studentBalance, 18));

        // Check if contract needs more tokens
        const hasEnoughTokens = BigInt(contractBalance) >= BigInt(requiredBalance);
        if (!hasEnoughTokens) {
            console.log("\nMinting additional EDU tokens for rewards...");
            try {
                // Check if we're the owner
                const owner = await eduToken.owner();
                if (owner.toLowerCase() !== signer.address.toLowerCase()) {
                    console.log("Not authorized to mint EDU tokens");
                    return;
                }

                // Mint tokens to the contract
                const amountToMint = hre.ethers.parseUnits("10", 18); // Mint 10 EDU tokens
                const mintTx = await eduToken.mint(certificateNFTAddress, amountToMint);
                await mintTx.wait();

                // Verify new balance
                const newContractBalance = await eduToken.balanceOf(certificateNFTAddress);
                console.log("New CertificateNFT Contract Balance:", hre.ethers.formatUnits(newContractBalance, 18));
            } catch (error) {
                console.error("Error minting EDU tokens:", error.message);
                return;
            }
        }
    } catch (error) {
        console.error("Error managing token balances:", error.message);
        return;
    }

    // 8. Mint certificate
    console.log("\n=== Minting Certificate for CS102 ===");
    try {
        // First check if we're authorized
        if (!isAgent) {
            throw new Error("Not authorized to mint certificates");
        }

        // Prepare certificate data
        const studentAddress = signer.address;
        const courseId = cs102Id;
        const grade = 90;
        const credits = 4;
        const metadataURI = "https://edulink.edu/certificates/metadata/cs102";

        console.log("Minting certificate with the following details:");
        console.log("Student:", studentAddress);
        console.log("Course ID:", courseId);
        console.log("Grade:", grade);
        console.log("Credits:", credits);

        // Mint the certificate
        console.log("\nSubmitting transaction...");
        const mintTx = await certificateNFT.safeMint(
            studentAddress,
            courseId,
            grade,
            credits,
            metadataURI
        );
        console.log("Transaction hash:", mintTx.hash);
        console.log("Waiting for confirmation...");
        await mintTx.wait();
        console.log("Certificate minted successfully!");

        // Get updated certificate balance and education history
        const newCertBalance = await certificateNFT.balanceOf(signer.address);
        const newHistory = await certificateNFT.getEducationHistory(signer.address);
        
        console.log("\nUpdated Certificate Status:");
        console.log("Certificate Balance:", newCertBalance.toString());
        console.log("Total Credits:", newHistory[0].toString());
        console.log("Total Certificates:", newHistory[1] ? newHistory[1].length : 0);

        console.log("\n=== Educational Achievements ===");
        const studentCerts = await certificateNFT.getStudentCertificates(signer.address);
        console.log(`Total Certificates: ${studentCerts.length}`);
        
        let totalCredits = 0;
        console.log("\nCertificate Details:");
        for (const tokenId of studentCerts) {
            const cert = await certificateNFT.getCertificate(tokenId);
            const course = await courseCatalog.getCourse(cert.courseId);
            
            console.log(`\nCertificate #${tokenId}:`);
            console.log(`Course: ${course.name}`);
            console.log(`Grade: ${cert.grade}%`);
            console.log(`Credits: ${cert.creditsEarned}`);
            console.log(`Completion Date: ${new Date(Number(cert.completionDate) * 1000).toLocaleDateString()}`);
            console.log(`Verified: ${cert.isVerified}`);
            
            totalCredits += Number(cert.creditsEarned);
        }
        
        // Get specializations
        const eduHistory = await certificateNFT.getEducationHistory(signer.address);
        console.log("\nSpecializations:");
        if (eduHistory[2] && eduHistory[2].length > 0) {
            eduHistory[2].forEach(spec => console.log(`- ${spec}`));
        } else {
            console.log("No specializations completed yet");
        }
        
        // Show token balances
        const eduBalance = await eduToken.balanceOf(signer.address);
        console.log("\nEducational Credits:");
        console.log(`Total Credits Earned: ${totalCredits}`);
        console.log(`EDU Token Balance: ${hre.ethers.formatUnits(eduBalance, 18)} EDU`);

        // Verify EduToken rewards
        const newStudentBalance = await eduToken.balanceOf(signer.address);
        console.log("\nNew Student EduToken Balance:", hre.ethers.formatUnits(newStudentBalance, 18));
    } catch (error) {
        console.error("Error minting certificate:", error.message);
        if (error.message.includes("execution reverted")) {
            console.log("\nPossible reasons for failure:");
            console.log("1. Course prerequisites not met");
            console.log("2. Course already completed");
            console.log("3. Insufficient EduToken balance");
            console.log("4. Invalid course ID or metadata");
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
