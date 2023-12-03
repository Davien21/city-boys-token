const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  // Deploy the mock USDT contract
  const USDT = await ethers.getContractFactory("USDT");
  const usdt = await USDT.deploy();
  await usdt.deployed();
  console.log("USDT deployed to:", usdt.address);

  // Deploy the CityBoysToken contract
  const CityBoysToken = await ethers.getContractFactory("CityBoysToken");
  const ctbToken = await CityBoysToken.deploy();
  await ctbToken.deployed();
  console.log("CityBoysToken deployed to:", ctbToken.address);

  // Deploy the CityBoysMarket contract
  const CityBoysMarket = await ethers.getContractFactory("CityBoysMarket");
  const market = await CityBoysMarket.deploy(ctbToken.address, usdt.address);
  await market.deployed();
  console.log("CityBoysMarket deployed to:", market.address);

  // Mint 5 million CityBoysTokens to the CityBoysMarket contract
  const fiveMillionTokens = ethers.utils.parseUnits("5000000", 18);
  await ctbToken.mint(market.address, fiveMillionTokens);
  console.log(`Minted 5 million tokens to CityBoysMarket at address ${market.address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
