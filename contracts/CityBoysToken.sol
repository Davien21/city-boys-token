// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";

contract CityBoysToken is ERC20Permit, Ownable {
    constructor() ERC20Permit("CityBoysToken") ERC20("CityBoysToken", "$CTB") {
        _mint(msg.sender, 5000000 * 10 ** decimals());
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
