const { expect } = require("chai");
const { ethers, waffle } = require("hardhat");
const { parseUnits, parseEther } = ethers.utils;

// Helper function to advance time on the Ethereum test network
// NOTE: You will need to implement this function
async function advanceTimeAndBlock(time) {
  await ethers.provider.send("evm_increaseTime", [time]);
  await ethers.provider.send("evm_mine");
}

describe("CityBoysMarket and CityBoysToken", async () => {
  let owner, buyer, USDT, usdt, CityBoysToken, ctbToken, CityBoysMarket, market;

  beforeEach(async () => {
    [owner, buyer] = await ethers.getSigners();
    USDT = await ethers.getContractFactory("USDT");
    usdt = await USDT.deploy();
    await usdt.deployed();
    await usdt.mint(owner.address, parseUnits("100", 6));
    await usdt.mint(buyer.address, parseUnits("100", 6));

    CityBoysToken = await ethers.getContractFactory("CityBoysToken");
    ctbToken = await CityBoysToken.deploy();
    await ctbToken.deployed();

    CityBoysMarket = await ethers.getContractFactory("CityBoysMarket");
    market = await CityBoysMarket.deploy(ctbToken.address, usdt.address);
    await market.deployed();

    await ctbToken.mint(market.address, parseUnits("5000000", 18));
  });

  it("should deploy contracts", async () => {
    expect(usdt.address).to.not.equal(null);
    expect(ctbToken.address).to.not.equal(null);
    expect(market.address).to.not.equal(null);
  });

  it("should have minted 5 Million $CTB to market on deploy", async () => {
    const mintAmount = ethers.utils.parseUnits("5000000", 18);
    const marketCtbBalance = await ctbToken.balanceOf(market.address);
    expect(marketCtbBalance).to.equal(mintAmount);
  });

  it("should not allow owner to start presale if there is active one", async () => {
    const endTime = Math.floor(Date.now() / 1000) + 3600;
    const priceInEth = parseEther("0.01");
    const priceInUSDT = parseUnits("10", 6);

    await market.connect(owner).startPresale(endTime, priceInEth, priceInUSDT);

    // await expect(
    //   market.connect(owner).startPresale(endTime, priceInEth, priceInUSDT)
    // ).to.be.revertedWith("Cannot start new presale.");
  });

  it("should allow owner to start a presale", async () => {
    const endTime = Math.floor(Date.now() / 1000) + 3600;
    const priceInEth = parseEther("0.01");
    const priceInUSDT = parseUnits("10", 6);

    await market.connect(owner).startPresale(endTime, priceInEth, priceInUSDT);

    const presale = await market.presaleRounds(1);
    expect(presale.endTime).to.equal(endTime);
    expect(presale.priceInEth).to.equal(priceInEth);
    expect(presale.priceInUSDT).to.equal(priceInUSDT);
  });

  it("should allow buying tokens with ETH", async () => {
    const endTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
    const priceInEth = parseEther("0.01");
    const priceInUSDT = parseUnits("10", 6);

    const previousCTBInMarket = await ctbToken.balanceOf(market.address);
    const previousCTBInBuyer = await ctbToken.balanceOf(buyer.address);

    const startTx = await market
      .connect(owner)
      .startPresale(endTime, priceInEth, priceInUSDT);
    await expect(startTx).to.emit(market, "PresaleStarted"); // Event Check

    const buyTx = await market.connect(buyer).buyWithEth({ value: priceInEth });
    await expect(buyTx).to.emit(market, "TokensPurchased"); // Event Check

    const balanceOfBuyer = await ctbToken.balanceOf(buyer.address);
    const balanceOfMarket = await ctbToken.balanceOf(market.address);

    expect(balanceOfBuyer).to.be.gt(previousCTBInBuyer);
    expect(balanceOfMarket).to.be.lt(previousCTBInMarket);
    expect(balanceOfMarket).to.equal(previousCTBInMarket.sub(balanceOfBuyer));
  });

  it("should approve USDT from buyer to the market", async () => {
    const amount = parseUnits("100", 6);
    await usdt.connect(buyer).approve(market.address, amount);
    const allowance = await usdt.allowance(buyer.address, market.address);
    expect(allowance).to.equal(amount);
  });

  it("should allow buying tokens with USDT", async () => {
    const endTime = Math.floor(Date.now() / 1000) + 3600;
    const priceInEth = parseEther("0.01");
    const priceInUSDT = parseUnits("10", 6);

    await market.connect(owner).startPresale(endTime, priceInEth, priceInUSDT);

    await usdt.connect(buyer).approve(market.address, priceInUSDT);

    await market.connect(buyer).buyWithUSDT(priceInUSDT);

    const balanceOfBuyer = await ctbToken.balanceOf(buyer.address);
    expect(balanceOfBuyer).to.be.gt(0);
  });

  it("should pause the market and prevent buying with ETH or USDT", async () => {
    const endTime = Math.floor(Date.now() / 1000) + 3600;
    const priceInEth = parseEther("0.01");
    const priceInUSDT = parseUnits("10", 6);

    await market.connect(owner).startPresale(endTime, priceInEth, priceInUSDT);

    await market.connect(owner).pausePresale();

    await expect(
      market.connect(buyer).buyWithEth({ value: priceInEth })
    ).to.be.revertedWith("Pausable: paused");

    await usdt.connect(buyer).approve(market.address, priceInUSDT);
    await expect(
      market.connect(buyer).buyWithUSDT(priceInUSDT)
    ).to.be.revertedWith("Pausable: paused");

    expect(await ctbToken.balanceOf(buyer.address)).to.equal(0);
  });

  it("should not allow purchases after the presale has ended", async () => {
    const endTime = Math.floor(Date.now() / 1000) + 5;
    const priceInEth = parseEther("0.01");
    const priceInUSDT = parseUnits("10", 6);

    await market.connect(owner).startPresale(endTime, priceInEth, priceInUSDT);

    await advanceTimeAndBlock(7);

    await expect(
      market.connect(buyer).buyWithEth({ value: priceInEth })
    ).to.be.revertedWith("Presale round has ended.");

    await usdt.connect(buyer).approve(market.address, priceInUSDT);
    await expect(
      market.connect(buyer).buyWithUSDT(priceInUSDT)
    ).to.be.revertedWith("Presale round has ended.");

    expect(await ctbToken.balanceOf(buyer.address)).to.equal(0);
  });

  it("should allow owner to withdraw any funds in the market", async () => {
    const endTime = Math.floor(Date.now() / 1000) + 3600;
    const priceInEth = parseEther("0.01");
    const priceInUSDT = parseUnits("10", 6);

    await market.connect(owner).startPresale(endTime, priceInEth, priceInUSDT);

    await market.connect(buyer).buyWithEth({ value: priceInEth });
    await usdt.connect(buyer).approve(market.address, priceInUSDT);
    await market.connect(buyer).buyWithUSDT(priceInUSDT);

    const balanceBefore = await usdt.balanceOf(owner.address);
    await market.connect(owner).withdrawFunds();
    const balanceAfter = await usdt.balanceOf(owner.address);

    expect(balanceAfter).to.be.gt(balanceBefore);
  });

  it("should not allow owner to withdraw tokens until after all presales", async () => {
    const endTime = Math.floor(Date.now() / 1000) + 5;
    const priceInEth = parseEther("0.01");
    const priceInUSDT = parseUnits("10", 6);

    await market.connect(owner).startPresale(endTime, priceInEth, priceInUSDT);

    await advanceTimeAndBlock(7);

    await expect(market.connect(owner).withdrawCTBTokens()).to.be.revertedWith(
      "Please wait for all presales to finish."
    );
  });

  it("should allow withdrawal of remaining tokens after all presales", async () => {
    for (let round = 1; round <= 4; round++) {
      const endTime = Math.floor(Date.now() / 1000) + 5; // Assuming each round lasts 5 seconds
      const priceInEth = parseEther("0.01");
      const priceInUSDT = parseUnits("10", 6);

      // Start the presale round
      await market
        .connect(owner)
        .startPresale(endTime, priceInEth, priceInUSDT);

      // Advance time to complete the presale round
      await advanceTimeAndBlock(7);
    }

    // Withdraw remaining CTB tokens after all rounds are complete
    await market.connect(owner).withdrawCTBTokens();

    const balanceOfOwner = await ctbToken.balanceOf(owner.address);
    const balanceOfMarket = await ctbToken.balanceOf(market.address);
    const round = await market.currentRound();

    expect(round).to.equal(4);
    expect(balanceOfMarket).to.equal(0);
    expect(balanceOfOwner).to.be.gt(0);
  });
});
