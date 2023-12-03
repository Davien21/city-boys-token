const { ethers } = require("hardhat");

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const [owner, buyer] = await ethers.getSigners();

  // Deploy Mocked USDT contract
  const USDT = await ethers.getContractFactory("USDT");
  const usdt = await USDT.deploy();
  await usdt.deployed();
  console.log("Mocked USDT deployed to:", usdt.address);

  // Deploy CityBoysToken
  const CityBoysToken = await ethers.getContractFactory("CityBoysToken");
  const ctbToken = await CityBoysToken.deploy();
  await ctbToken.deployed();
  console.log("CityBoysToken deployed to:", ctbToken.address);

  // Deploy CityBoysMarket
  const CityBoysMarket = await ethers.getContractFactory("CityBoysMarket");
  const market = await CityBoysMarket.deploy(ctbToken.address, usdt.address);
  await market.deployed();
  console.log("CityBoysMarket deployed to:", market.address);

  // Mint CTB tokens and check the balance
  const mintAmount = ethers.utils.parseUnits("1000", 18);
  await ctbToken.connect(owner).mint(market.address, mintAmount);
  const marketCtbBalance = await ctbToken.balanceOf(market.address);
  console.log(
    "CityBoysMarket $CTB balance after minting:",
    ethers.utils.formatUnits(marketCtbBalance, 18)
  );

  for (let i = 1; i <= 3; i++) {
    // Start a presale round
    const endTime = Math.floor(Date.now() / 1000) + 20; // 20 seconds from now
    const priceInEth = ethers.utils.parseUnits(i.toString(), "wei");
    const priceInUSDT = ethers.utils.parseUnits(i.toString(), 6); // assuming 6 decimals for USDT
    await market.connect(owner).startPresale(endTime, priceInEth, priceInUSDT);
    console.log(`\nStarted presale round ${i} with end time: ${endTime}`);

    // Mint USDT for the buyer
    await usdt.mint(buyer.address, priceInUSDT);

    // Buyer approves market to spend his USDT
    await usdt.connect(buyer).approve(market.address, priceInUSDT);
    console.log(`\nRound ${i}: Approved CityBoysMarket to spend buyer's USDT`);

    // Pause market
    await market.connect(owner).pause();
    console.log(`\nRound ${i}: Market paused`);

    // Test purchases while paused (should fail)
    try {
      await market.connect(buyer).buyWithUSDT(priceInUSDT);
    } catch (err) {
      console.log(
        `\nRound ${i}: Purchase with USDT failed as expected while paused`
      );
    }

    try {
      await market.connect(buyer).buyWithEth({ value: priceInEth });
    } catch (err) {
      console.log(
        `\nRound ${i}: Purchase with Eth failed as expected while paused`
      );
    }

    // Sleep for 5 seconds
    await sleep(5000);

    // Unpause market
    await market.connect(owner).unpause();
    console.log(`\nRound ${i}: Market unpaused`);

    // Test purchases while unpaused (should succeed)
    await market.connect(buyer).buyWithUSDT(priceInUSDT);
    console.log(`\nRound ${i}: Purchase with USDT succeeded after unpausing`);

    await market.connect(buyer).buyWithEth({ value: priceInEth });
    console.log(`\nRound ${i}: Purchase with Eth succeeded after unpausing`);

    // Sleep for 15 seconds to let the presale round end
    await sleep(15000);

    // Owner withdraws funds
    await market.connect(owner).withdrawFunds();
    console.log(`\nRound ${i}: Owner withdrew funds`);

    // Owner withdraws unsold tokens
    await market.connect(owner).withdrawCTBTokens();
    console.log(`\nRound ${i}: Owner withdrew unsold tokens`);
  }

  // Check buyer's CityBoysToken balance after all rounds
  const buyerCTBBalanceAfter = await ctbToken.balanceOf(buyer.address);
  console.log(
    "\nBuyer's CityBoysToken balance after all rounds:",
    ethers.utils.formatUnits(buyerCTBBalanceAfter, 18)
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
