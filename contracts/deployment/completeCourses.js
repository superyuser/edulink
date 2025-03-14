const hre = require("hardhat");

async function main() {
    // Contract addresses from deployment
    const eduTokenAddress = "0x803415c7d4454D20A7490cC16aD83e06A96B0127";
    const courseCatalogAddress = "0x87787F9D5007e9f8c813555D84F391245018f953";
    const certificateNFTAddress = "0xCfC5c0aadB552b69E9126E26aA25B55Ebb0Dae8c";
    const agentManagerAddress = "0xEa0768354525cbCdA1c148bAfBF81ba67924a0cE";

    // Get contract instances
    const EduToken = await hre.ethers.getContractFactory("EduToken");
    const CourseCatalog = await hre.ethers.getContractFactory("CourseCatalog");
    const CertificateNFT = await hre.ethers.getContractFactory("CertificateNFT");
    const AgentManager = await hre.ethers.getContractFactory("AgentManager");

    const eduToken = EduToken.attach(eduTokenAddress);
    const courseCatalog = CourseCatalog.attach(courseCatalogAddress);
    const certificateNFT = CertificateNFT.attach(certificateNFTAddress);
    const agentManager = AgentManager.attach(agentManagerAddress);

    // Get signer
    const [signer] = await hre.ethers.getSigners();
    console.log("Using account:", await signer.getAddress());

    // Course IDs (from starter.js output)
    const cs101Id = "0x15fc17c92fc4afa158f61e98cb9d8ce90868ded9868c982c16c42b259462f198";
    const cs102Id = "0x6b440d4fc11f57714dcecaa5fd5ac10b309e5216e9485f06f69796f5ab5a81f2";

    try {
        // Step 1: Complete CS101 (Introduction to Programming)
        console.log("\n=== Completing CS101 ===");
        
        // Verify university authorization
        const isAuthorized = await certificateNFT.authorizedUniversities(await signer.getAddress());
        if (!isAuthorized) {
            console.log("Authorizing signer as university...");
            const authTx = await certificateNFT.authorizeUniversity(await signer.getAddress(), true);
            await authTx.wait();
            console.log("Successfully authorized as university");
        }

        // Mint CS101 certificate
        console.log("Minting certificate for CS101...");
        const cs101Tx = await certificateNFT.safeMint(
            await signer.getAddress(),
            cs101Id,
            85, // Grade (85%)
            3,  // Credits
            "ipfs://cs101-certificate" // Metadata URI
        );
        await cs101Tx.wait();
        console.log("Successfully minted CS101 certificate!");

        // Step 2: Complete CS102 (Advanced Programming)
        console.log("\n=== Completing CS102 ===");
        
        // Verify prerequisites
        console.log("Checking prerequisites...");
        const prereqsMet = await courseCatalog.validatePrerequisites(cs102Id, [cs101Id]);
        if (!prereqsMet) {
            throw new Error("Prerequisites not met for CS102");
        }
        console.log("Prerequisites verified!");

        // Mint CS102 certificate
        console.log("Minting certificate for CS102...");
        const cs102Tx = await certificateNFT.safeMint(
            await signer.getAddress(),
            cs102Id,
            90, // Grade (90%)
            4,  // Credits
            "ipfs://cs102-certificate" // Metadata URI
        );
        await cs102Tx.wait();
        console.log("Successfully minted CS102 certificate!");

        // Display final achievements
        const certBalance = await certificateNFT.balanceOf(await signer.getAddress());
        const eduBalance = await eduToken.balanceOf(await signer.getAddress());
        
        console.log("\n=== Final Achievement Status ===");
        console.log(`Total Certificates: ${certBalance}`);
        console.log(`EDU Token Balance: ${hre.ethers.formatUnits(eduBalance, 18)} EDU`);
        
        // Get education history
        console.log("\nEducation History:");
        const certificateIds = [];
        const certCount = await certificateNFT.balanceOf(await signer.getAddress());
        
        // Get all certificate IDs
        for (let i = 0; i < certCount; i++) {
            const tokenId = await certificateNFT.tokenOfOwnerByIndex(await signer.getAddress(), i);
            certificateIds.push(tokenId);
        }

        // Get certificate details
        for (const tokenId of certificateIds) {
            const cert = await certificateNFT.certificates(tokenId);
            const course = await courseCatalog.getCourse(cert.courseId);
            console.log(`Course: ${course.name}`);
            console.log(`Grade: ${cert.grade}%`);
            console.log(`Credits: ${cert.credits}`);
            console.log(`Completion Date: ${new Date(Number(cert.date) * 1000).toLocaleDateString()}`);
            console.log("---");
        }

    } catch (error) {
        console.error("Error:", error.message);
        if (error.data) {
            console.error("Error data:", error.data);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
