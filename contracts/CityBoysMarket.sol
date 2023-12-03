// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./ICityBoysToken.sol";

contract CityBoysMarket is Ownable, Pausable, ReentrancyGuard {
    ICityBoysToken public ctbToken;
    uint256 public currentRound;
    IERC20 public usdtToken;
    mapping(uint256 => PresaleRound) public presaleRounds;

    uint256 public constant TOKENS_LIMIT = 1e6 * 1e18;

    event PresaleStarted(
        uint256 round,
        uint256 endTime,
        uint256 priceInEth,
        uint256 priceInUSDT
    );
    event TokensPurchased(address indexed buyer, uint256 amount, uint256 round);

    struct PresaleRound {
        uint256 endTime;
        uint256 priceInEth;
        uint256 priceInUSDT;
        uint256 tokensSold;
    }

    constructor(address _ctbToken, address _usdtToken) {
        ctbToken = ICityBoysToken(_ctbToken);
        usdtToken = IERC20(_usdtToken);
    }

    function startPresale(
        uint256 _endTime,
        uint256 _priceInEth,
        uint256 _priceInUSDT
    ) external onlyOwner nonReentrant {
        require(currentRound <= 3, "Cannot start new presale.");
        require(
            (block.timestamp > uint(presaleRounds[currentRound].endTime)),
            "Previous presale round has not ended."
        );
        currentRound++;
        presaleRounds[currentRound] = PresaleRound(
            _endTime,
            _priceInEth,
            _priceInUSDT,
            0
        );
        emit PresaleStarted(currentRound, _endTime, _priceInEth, _priceInUSDT);
    }

function buyWithEth() external payable whenNotPaused nonReentrant {
    require(
        currentRound > 0 && currentRound <= 4,
        "Invalid presale round."
    );
    require(
        block.timestamp <= presaleRounds[currentRound].endTime,
        "Presale round has ended."
    );

    uint256 ethAmount = msg.value;
    require(
        ethAmount >= presaleRounds[currentRound].priceInEth,
        "Amount below presale price."
    );

    uint256 tokensToBuy = (ethAmount * 1e18) / presaleRounds[currentRound].priceInEth; // Assuming your token has 18 decimals
    require(
        presaleRounds[currentRound].tokensSold + tokensToBuy <= TOKENS_LIMIT,
        "Presale round token limit reached."
    );

    presaleRounds[currentRound].tokensSold += tokensToBuy;
    ctbToken.transfer(msg.sender, tokensToBuy);
    emit TokensPurchased(msg.sender, tokensToBuy, currentRound);
}

function buyWithUSDT(uint256 usdtAmount) external whenNotPaused nonReentrant {
    require(
        currentRound > 0 && currentRound <= 4,
        "Invalid presale round."
    );
    require(
        block.timestamp <= presaleRounds[currentRound].endTime,
        "Presale round has ended."
    );

    uint256 tokensToBuy = (usdtAmount * 1e18) / presaleRounds[currentRound].priceInUSDT; // Assuming your token has 18 decimals
    require(
        presaleRounds[currentRound].tokensSold + tokensToBuy <= TOKENS_LIMIT,
        "Unable to sell that amount of tokens."
    );

    usdtToken.transferFrom(msg.sender, address(this), usdtAmount);
    presaleRounds[currentRound].tokensSold += tokensToBuy;
    ctbToken.transfer(msg.sender, tokensToBuy);
    emit TokensPurchased(msg.sender, tokensToBuy, currentRound);
}


    function withdrawCTBTokens() external onlyOwner nonReentrant {
        require(currentRound == 4, "Please wait for all presales to finish.");
        require(
            block.timestamp > presaleRounds[4].endTime,
            "Please wait for all presales to finish."
        );
        uint256 remainingTokens = ctbToken.balanceOf(address(this));
        ctbToken.transfer(owner(), remainingTokens);
    }

    function withdrawFunds() external onlyOwner nonReentrant {
        uint256 ethBal = address(this).balance;
        uint256 usdtBal = usdtToken.balanceOf(address(this));
        require(ethBal > 0 || usdtBal == 0, "No funds to withdraw");
        if (usdtBal > 0) usdtToken.transfer(owner(), usdtBal);
        if (ethBal > 0) payable(owner()).transfer(ethBal);
    }

    function pausePresale() external onlyOwner {
        require(
            block.timestamp <= presaleRounds[currentRound].endTime,
            "Presale round has ended"
        );
        _pause();
    }

    function unpausePresale() external onlyOwner {
        require(
            block.timestamp <= presaleRounds[currentRound].endTime,
            "Presale round has ended"
        );
        _unpause();
    }
}
