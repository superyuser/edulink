const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("EduToken", function () {
    let EduToken;
    let eduToken;
    let owner;
    let student;
    let university;
    let others;
    const initialSupply = ethers.parseUnits("1000000", 18); // 1 million tokens with 18 decimals

    beforeEach(async function () {
        [owner, student, university, ...others] = await ethers.getSigners();

        // Deploy EduToken
        const EduTokenFactory = await ethers.getContractFactory("EduToken");
        eduToken = await EduTokenFactory.deploy();
    });

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            expect(await eduToken.owner()).to.equal(owner.address);
        });

        it("Should assign the total supply of tokens to the owner", async function () {
            const ownerBalance = await eduToken.balanceOf(owner.address);
            expect(await eduToken.totalSupply()).to.equal(ownerBalance);
        });

        it("Should have correct name and symbol", async function () {
            expect(await eduToken.name()).to.equal("Education Token");
            expect(await eduToken.symbol()).to.equal("EDU");
        });

        it("Should have correct initial supply", async function () {
            expect(await eduToken.totalSupply()).to.equal(initialSupply);
        });

        it("Should have correct decimals", async function () {
            expect(await eduToken.decimals()).to.equal(18);
        });
    });

    describe("Minting", function () {
        const mintAmount = ethers.parseUnits("1000", 18); // 1000 tokens

        it("Should allow owner to mint tokens", async function () {
            const initialBalance = await eduToken.balanceOf(student.address);
            await eduToken.mint(student.address, mintAmount);
            
            const finalBalance = await eduToken.balanceOf(student.address);
            expect(finalBalance - initialBalance).to.equal(mintAmount);
        });

        it("Should increase total supply when minting", async function () {
            const initialSupply = await eduToken.totalSupply();
            await eduToken.mint(student.address, mintAmount);
            
            const finalSupply = await eduToken.totalSupply();
            expect(finalSupply - initialSupply).to.equal(mintAmount);
        });

        it("Should emit Transfer event when minting", async function () {
            await expect(eduToken.mint(student.address, mintAmount))
                .to.emit(eduToken, "Transfer")
                .withArgs(ethers.ZeroAddress, student.address, mintAmount);
        });

        it("Should not allow non-owners to mint tokens", async function () {
            await expect(
                eduToken.connect(student).mint(student.address, mintAmount)
            ).to.be.revertedWithCustomError(
                eduToken,
                "OwnableUnauthorizedAccount"
            );
        });

        it("Should not allow minting to zero address", async function () {
            await expect(
                eduToken.mint(ethers.ZeroAddress, mintAmount)
            ).to.be.revertedWithCustomError(
                eduToken,
                "ERC20InvalidReceiver"
            );
        });
    });

    describe("Transfers", function () {
        const transferAmount = ethers.parseUnits("1000", 18); // 1000 tokens

        beforeEach(async function () {
            // Mint some tokens to student for testing transfers
            await eduToken.mint(student.address, transferAmount);
        });

        it("Should transfer tokens between accounts", async function () {
            const initialStudentBalance = await eduToken.balanceOf(student.address);
            const initialUniversityBalance = await eduToken.balanceOf(university.address);

            await eduToken.connect(student).transfer(university.address, transferAmount);

            const finalStudentBalance = await eduToken.balanceOf(student.address);
            const finalUniversityBalance = await eduToken.balanceOf(university.address);

            expect(finalStudentBalance).to.equal(initialStudentBalance - transferAmount);
            expect(finalUniversityBalance).to.equal(initialUniversityBalance + transferAmount);
        });

        it("Should emit Transfer event", async function () {
            await expect(eduToken.connect(student).transfer(university.address, transferAmount))
                .to.emit(eduToken, "Transfer")
                .withArgs(student.address, university.address, transferAmount);
        });

        it("Should fail if sender doesn't have enough tokens", async function () {
            const balance = await eduToken.balanceOf(student.address);
            await expect(
                eduToken.connect(student).transfer(university.address, balance + 1n)
            ).to.be.revertedWithCustomError(
                eduToken,
                "ERC20InsufficientBalance"
            );
        });

        it("Should not allow transfer to zero address", async function () {
            await expect(
                eduToken.connect(student).transfer(ethers.ZeroAddress, transferAmount)
            ).to.be.revertedWithCustomError(
                eduToken,
                "ERC20InvalidReceiver"
            );
        });
    });

    describe("Allowances", function () {
        const allowanceAmount = ethers.parseUnits("1000", 18); // 1000 tokens
        const transferAmount = ethers.parseUnits("500", 18); // 500 tokens

        beforeEach(async function () {
            // Mint tokens to student for testing allowances
            await eduToken.mint(student.address, allowanceAmount);
            // Student approves university to spend tokens
            await eduToken.connect(student).approve(university.address, allowanceAmount);
        });

        it("Should update allowance correctly", async function () {
            const allowance = await eduToken.allowance(student.address, university.address);
            expect(allowance).to.equal(allowanceAmount);
        });

        it("Should emit Approval event", async function () {
            await expect(eduToken.connect(student).approve(university.address, allowanceAmount))
                .to.emit(eduToken, "Approval")
                .withArgs(student.address, university.address, allowanceAmount);
        });

        it("Should allow transferFrom within allowance", async function () {
            await eduToken.connect(university).transferFrom(
                student.address,
                others[0].address,
                transferAmount
            );

            const studentBalance = await eduToken.balanceOf(student.address);
            const receiverBalance = await eduToken.balanceOf(others[0].address);
            const remainingAllowance = await eduToken.allowance(
                student.address,
                university.address
            );

            expect(studentBalance).to.equal(allowanceAmount - transferAmount);
            expect(receiverBalance).to.equal(transferAmount);
            expect(remainingAllowance).to.equal(allowanceAmount - transferAmount);
        });

        it("Should not allow transferFrom beyond allowance", async function () {
            await expect(
                eduToken.connect(university).transferFrom(
                    student.address,
                    others[0].address,
                    allowanceAmount + 1n
                )
            ).to.be.revertedWithCustomError(
                eduToken,
                "ERC20InsufficientAllowance"
            );
        });

        it("Should not allow transferFrom if sender has insufficient balance", async function () {
            // Approve more than balance
            await eduToken.connect(student).approve(
                university.address,
                allowanceAmount * 2n
            );

            await expect(
                eduToken.connect(university).transferFrom(
                    student.address,
                    others[0].address,
                    allowanceAmount + 1n
                )
            ).to.be.revertedWithCustomError(
                eduToken,
                "ERC20InsufficientBalance"
            );
        });
    });
});
