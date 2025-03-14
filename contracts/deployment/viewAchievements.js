const hre = require("hardhat");

async function main() {
    // Contract addresses, subject to change
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
    console.log("=== Educational Achievement Dashboard ===");
    console.log("Account:", signer.address);

    try {
        // 1. Get all certificates
        const studentCerts = await certificateNFT.getStudentCertificates(signer.address);
        console.log("\nCertificates Earned:", studentCerts.length);

        // 2. Display detailed certificate information
        let totalCredits = 0;
        if (studentCerts.length > 0) {
            console.log("\nCourse Completion Details:");
            for (const tokenId of studentCerts) {
                const cert = await certificateNFT.getCertificate(tokenId);
                const course = await courseCatalog.getCourse(cert.courseId);
                
                console.log(`\nCertificate #${tokenId}:`);
                console.log(`Course: ${course.name}`);
                console.log(`Grade: ${cert.grade}%`);
                console.log(`Credits: ${cert.creditsEarned}`);
                console.log(`Completion Date: ${new Date(Number(cert.completionDate) * 1000).toLocaleDateString()}`);
                console.log(`Status: ${cert.isVerified ? '✓ Verified' : 'Pending Verification'}`);
                
                totalCredits += Number(cert.creditsEarned);
            }
        } else {
            console.log("\nNo certificates earned yet");
        }

        // 3. Get education history and specializations
        const eduHistory = await certificateNFT.getEducationHistory(signer.address);
        console.log("\nProgram Progress:");
        console.log(`Total Credits Accumulated: ${totalCredits}`);

        if (eduHistory[2] && eduHistory[2].length > 0) {
            console.log("\nSpecializations Completed:");
            eduHistory[2].forEach(spec => console.log(`- ${spec}`));
        } else {
            console.log("\nNo specializations completed yet");
        }

        // 4. Show token balances and rewards
        const eduBalance = await eduToken.balanceOf(signer.address);
        console.log("\nEducational Rewards:");
        console.log(`EDU Token Balance: ${hre.ethers.formatUnits(eduBalance, 18)} EDU`);

        // 5. Show authorization status
        const isAuthorizedUniv = await certificateNFT.authorizedUniversities(signer.address);
        const isAgent = await agentManager.isAuthorizedAgent(signer.address);
        console.log("\nAuthorization Status:");
        console.log(`University Authorization: ${isAuthorizedUniv ? '✓ Authorized' : 'Not Authorized'}`);
        console.log(`Agent Status: ${isAgent ? '✓ Authorized Agent' : 'Not an Agent'}`);

    } catch (error) {
        console.error("Error fetching educational achievements:", error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
