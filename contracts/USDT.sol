// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract USDT is ERC20 {
    constructor() ERC20("Test Tether", "USDT") {}

    function decimals() public view virtual override returns (uint8) {
        return 6;
    }

    // Function to mint more tokens, accessible by anyone
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
