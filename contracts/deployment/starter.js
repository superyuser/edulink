const hre = require("hardhat");

async function main() {
    try {
        const [deployer] = await hre.ethers.getSigners();
        console.log("Deploying contracts with the account:", deployer.address);
        
        // Check deployer balance
        const balance = await deployer.provider.getBalance(deployer.address);
        console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");
        
        if (balance < hre.ethers.parseEther("0.1")) {
            throw new Error("Insufficient balance for deployment. Need at least 0.1 ETH");
        }

    // 1. Deploy EduToken
    console.log("Deploying EduToken...");
    const EduToken = await hre.ethers.getContractFactory("EduToken");
    const eduToken = await EduToken.deploy();
    await eduToken.waitForDeployment();
    console.log("EduToken deployed to:", await eduToken.getAddress());

    // 2. Deploy CourseCatalog
    console.log("\nDeploying CourseCatalog...");
    const CourseCatalog = await hre.ethers.getContractFactory("CourseCatalog");
    const courseCatalog = await CourseCatalog.deploy();
    await courseCatalog.waitForDeployment();
    console.log("CourseCatalog deployed to:", await courseCatalog.getAddress());

    // 3. Deploy CertificateNFT
    console.log("\nDeploying CertificateNFT...");
    const CertificateNFT = await hre.ethers.getContractFactory("CertificateNFT");
    const certificateNFT = await CertificateNFT.deploy(
        await courseCatalog.getAddress(),
        await eduToken.getAddress()
    );
    await certificateNFT.waitForDeployment();
    console.log("CertificateNFT deployed to:", await certificateNFT.getAddress());

    // 4. Deploy AgentManager
    console.log("\nDeploying AgentManager...");
    const AgentManager = await hre.ethers.getContractFactory("AgentManager");
    const agentManager = await AgentManager.deploy(await certificateNFT.getAddress());
    await agentManager.waitForDeployment();
    console.log("AgentManager deployed to:", await agentManager.getAddress());

    // 5. Set up contract relationships
    console.log("\nSetting up contract relationships...");

    // Add CertificateNFT as a university in CourseCatalog
    const certNFTAddress = await certificateNFT.getAddress();
    await courseCatalog.addUniversity("EduLink Certificates");
    console.log("Added CertificateNFT university to CourseCatalog");

    // Authorize AgentManager in CertificateNFT
    const agentManagerAddress = await agentManager.getAddress();

    // Verify ownership of all contracts
    const eduTokenOwner = await eduToken.owner();
    const courseCatalogOwner = await courseCatalog.owner();
    const certificateNFTOwner = await certificateNFT.owner();
    const agentManagerOwner = await agentManager.owner();

    console.log("\nVerifying contract ownership...");
    console.log(`EduToken owner: ${eduTokenOwner}`);
    console.log(`CourseCatalog owner: ${courseCatalogOwner}`);
    console.log(`CertificateNFT owner: ${certificateNFTOwner}`);
    console.log(`AgentManager owner: ${agentManagerOwner}`);

    if (eduTokenOwner !== deployer.address ||
        courseCatalogOwner !== deployer.address ||
        certificateNFTOwner !== deployer.address ||
        agentManagerOwner !== deployer.address) {
        throw new Error("Contract ownership not properly set to deployer");
    }
    console.log("All contracts owned by deployer:", deployer.address);

    // Add university in CourseCatalog
    const universityName = "EduLink Certificates";
    console.log(`\nSetting up university '${universityName}'...`);
    
    // Calculate university ID the same way contract does
    const universityId = hre.ethers.keccak256(hre.ethers.toUtf8Bytes(universityName));
    
    try {
        // Check if university already exists
        const existingUniv = await courseCatalog.universities(universityId);
        if (existingUniv.isVerified) {
            console.log('University already exists, skipping addition');
        } else {
            // Add university with explicit gas settings for Sepolia
            const addUnivTx = await courseCatalog.addUniversity(universityName, {
                gasLimit: 200000
            });
            console.log(`Adding university... Transaction hash: ${addUnivTx.hash}`);
            const receipt = await addUnivTx.wait();
            
            if (receipt.status === 0) {
                throw new Error('Transaction failed');
            }
            console.log('Transaction mined successfully');
        }
        
        // Verify university was added correctly (with retries)
        let university;
        for (let attempt = 3; attempt > 0; attempt--) {
            university = await courseCatalog.universities(universityId);
            if (university.isVerified) {
                console.log('University verified successfully');
                break;
            }
            console.log(`Waiting for university verification... (${attempt} attempts left)`);
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    } catch (error) {
        console.error('Failed to add university:', error.message);
        if (error.data) {
            try {
                // Try to decode the revert reason
                const reason = courseCatalog.interface.parseError(error.data);
                console.error('Revert reason:', reason);
            } catch (e) {
                // If we can't parse the error, just show the raw data
                console.error('Raw error data:', error.data);
            }
        }
        throw error;
    }
    
    if (!university.isVerified) {
        throw new Error(`Failed to verify university ${universityName} after multiple attempts`);
    }
    console.log(`Successfully added university with ID ${universityId}`);

    // Authorize CertificateNFT to mint certificates
    console.log("\nAuthorizing CertificateNFT...");
    const authCertTx = await certificateNFT.authorizeUniversity(certNFTAddress, true);
    console.log(`Transaction hash: ${authCertTx.hash}`);
    await authCertTx.wait();
    console.log("Authorized CertificateNFT to mint certificates");

    // Authorize AgentManager to request certificates
    console.log("\nAuthorizing AgentManager...");
    const authAgentTx = await certificateNFT.authorizeUniversity(agentManagerAddress, true);
    console.log(`Transaction hash: ${authAgentTx.hash}`);
    await authAgentTx.wait();
    console.log("Authorized AgentManager to request certificates");

    // Authorize deployer as an agent for testing
    console.log("\nAuthorizing deployer as agent...");
    const authDeployerTx = await agentManager.authorizeAgent(deployer.address);
    console.log(`Transaction hash: ${authDeployerTx.hash}`);
    await authDeployerTx.wait();
    
    // Verify agent authorization (with retries)
    let isAuthorized = false;
    for (let attempt = 3; attempt > 0; attempt--) {
        isAuthorized = await agentManager.isAuthorizedAgent(deployer.address);
        if (isAuthorized) break;
        console.log(`Waiting for agent authorization... (${attempt} attempts left)`);
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    if (!isAuthorized) {
        throw new Error("Failed to authorize deployer as agent after multiple attempts");
    }
    console.log("Successfully authorized deployer as agent:", deployer.address);

    // Transfer initial tokens to CertificateNFT for distribution
    console.log("\nTransferring initial tokens...");
    const tokensForDistribution = hre.ethers.parseUnits("10", 18); // 10 tokens
    const transferTx = await eduToken.transfer(certNFTAddress, tokensForDistribution);
    console.log(`Transaction hash: ${transferTx.hash}`);
    await transferTx.wait();
    
    // Verify token transfer (with retries)
    let certNFTBalance;
    for (let attempt = 3; attempt > 0; attempt--) {
        certNFTBalance = await eduToken.balanceOf(certNFTAddress);
        if (certNFTBalance >= tokensForDistribution) break;
        console.log(`Waiting for token transfer... (${attempt} attempts left)`);
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    if (certNFTBalance < tokensForDistribution) {
        throw new Error(`Failed to transfer tokens to CertificateNFT after multiple attempts`);
    }
    console.log(`Successfully transferred ${hre.ethers.formatUnits(tokensForDistribution, 18)} tokens to CertificateNFT`);

    // Set up initial courses
    console.log("\nSetting up initial courses...");
    
    // Add basic course
    console.log("\nAdding basic course...");
    const course1Code = "CS101";
    const course1Name = "Introduction to Programming";
    const course1Credits = 3;
    const course1URI = "https://edulink.edu/courses/cs101";
    
    const addCourse1Tx = await courseCatalog.addCourse(
        course1Code,
        course1Name,
        course1Credits,
        universityId,
        course1URI
    );
    console.log(`Transaction hash: ${addCourse1Tx.hash}`);
    await addCourse1Tx.wait();
    
    // Calculate course ID the same way contract does
    const course1Id = hre.ethers.keccak256(
        hre.ethers.solidityPacked(["string", "bytes32"], [course1Code, universityId])
    );
    
    // Verify course was added (with retries)
    let course1;
    for (let attempt = 3; attempt > 0; attempt--) {
        try {
            course1 = await courseCatalog.getCourse(course1Id);
            if (course1.isActive) break;
        } catch (e) {
            console.log(`Waiting for course creation... (${attempt} attempts left)`);
        }
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    if (!course1 || !course1.isActive) {
        throw new Error(`Failed to add course ${course1Name} after multiple attempts`);
    }
    console.log(`Successfully added course ${course1Name} with ID ${course1Id}`);

    // Add advanced course, demo only
    console.log("\nAdding advanced course...");
    const course2Code = "CS102";
    const course2Name = "Advanced Programming";
    const course2Credits = 4;
    const course2URI = "https://edulink.edu/courses/cs102";
    
    const addCourse2Tx = await courseCatalog.addCourse(
        course2Code,
        course2Name,
        course2Credits,
        universityId,
        course2URI
    );
    console.log(`Transaction hash: ${addCourse2Tx.hash}`);
    await addCourse2Tx.wait();
    
    // Calculate course ID the same way contract does
    const course2Id = hre.ethers.keccak256(
        hre.ethers.solidityPacked(["string", "bytes32"], [course2Code, universityId])
    );
    
    // Verify course was added (with retries)
    let course2;
    for (let attempt = 3; attempt > 0; attempt--) {
        try {
            course2 = await courseCatalog.getCourse(course2Id);
            if (course2.isActive) break;
        } catch (e) {
            console.log(`Waiting for course creation... (${attempt} attempts left)`);
        }
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    if (!course2 || !course2.isActive) {
        throw new Error(`Failed to add course ${course2Name} after multiple attempts`);
    }
    console.log(`Successfully added course ${course2Name} with ID ${course2Id}`);

    // Set up prerequisite relationship
    console.log("\nSetting up prerequisite relationship...");
    const addPrereqTx = await courseCatalog.addPrerequisite(course2Id, course1Id);
    console.log(`Transaction hash: ${addPrereqTx.hash}`);
    await addPrereqTx.wait();
    
    // Verify prerequisite was added (with retries)
    let prerequisites;
    for (let attempt = 3; attempt > 0; attempt--) {
        try {
            prerequisites = (await courseCatalog.getCourse(course2Id)).prerequisites;
            if (prerequisites.length > 0 && prerequisites[0] === course1Id) break;
        } catch (e) {
            console.log(`Waiting for prerequisite setup... (${attempt} attempts left)`);
        }
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    if (!prerequisites || prerequisites.length === 0 || prerequisites[0] !== course1Id) {
        throw new Error(`Failed to set up prerequisite relationship after multiple attempts`);
    }
    
    // Verify prerequisite validation works
    const emptyCompletedCourses = [];
    const prereqCheck = await courseCatalog.validatePrerequisites(course2Id, emptyCompletedCourses);
    if (prereqCheck) {
        throw new Error(`Prerequisite validation failed: should require ${course1Name}`);
    }
    console.log(`Successfully set up and validated course prerequisite relationship`);

    // Verify final deployment state
    console.log("\nVerifying final deployment state...");
    
    // 1. Check contract addresses
    const eduTokenAddress = await eduToken.getAddress();
    const courseCatalogAddress = await courseCatalog.getAddress();
    
    // 2. Verify contract relationships
    const certNFTCatalog = await certificateNFT.courseCatalog();
    const certNFTToken = await certificateNFT.eduToken();
    const agentManagerCert = await agentManager.certificateContract();
    
    if (certNFTCatalog !== courseCatalogAddress ||
        certNFTToken !== eduTokenAddress ||
        agentManagerCert !== certNFTAddress) {
        throw new Error("Contract relationships not properly set up");
    }
    
    console.log("\nDeployment complete! Contract addresses:");
    console.log("EduToken:", eduTokenAddress);
    console.log("CourseCatalog:", courseCatalogAddress);
    console.log("CertificateNFT:", certNFTAddress);
    console.log("AgentManager:", agentManagerAddress);
    
    console.log("\nInitial courses:");
    console.log(`${course1Name} (${course1Code}): ${course1Id}`);
    console.log(`${course2Name} (${course2Code}): ${course2Id}`);
    
    console.log("\nAll contracts verified and ready for use!");
    } catch (error) {
        if (error.code === 'NETWORK_ERROR') {
            console.error('Network error - please check your connection to Sepolia');
        } else if (error.code === 'INSUFFICIENT_FUNDS') {
            console.error('Insufficient funds - please make sure you have enough ETH');
        } else if (error.code === 'NONCE_EXPIRED') {
            console.error('Nonce expired - transaction took too long, please try again');
        } else {
            console.error('Deployment failed:', error.message || error);
        }
        throw error;
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

// edu t: 0x9A52962BEcb5aC392Df4cfCfe3E74F66e67a4c81
// course catallog: 0x9566eD24caBBC1480234706d1e1683b622dbD5ae
// CNFT: 0xC8b2389F5Fb1caFB88FcB4fb51A9b98a07AdC3AD
// AgentManager: 0x1521e2293EE87bb44B0DeA8bef7C9780dD02D407