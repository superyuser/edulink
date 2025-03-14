// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract EduToken is ERC20, Ownable {
    constructor() ERC20("Education Token", "EDU") Ownable(msg.sender) {
        // Mint initial supply to the contract deployer
        _mint(msg.sender, 10 * 10 ** decimals()); // amount to be changed later, mint fewer for cost-saving purposes
    }

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}
