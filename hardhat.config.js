require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
require("dotenv").config({ path: ".env" });

const ALCHEMY_API_KEY_URL = process.env.ALCHEMY_API_KEY_URL;
const INFURA_API_KEY_URL = process.env.USDT_INFURA_API_KEY_URL;

const WALLET_PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY;

module.exports = {
  solidity: "0.8.4",
  networks: {
    // localhost: {
    //   url: "http://127.0.0.1:8545"
    // },
    // mainnet: {
    //   chainId: 1,
    //   url: ALCHEMY_API_KEY_URL,
    //   accounts: [WALLET_PRIVATE_KEY],
    // },
    // goerli: {
    //   url: INFURA_API_KEY_URL,
    //   accounts: [WALLET_PRIVATE_KEY],
    // },
    mumbai: {
      url: ALCHEMY_API_KEY_URL,
      accounts: [WALLET_PRIVATE_KEY],
    },
  },
  etherscan: {
    apiKey: process.env.POLYGONSCAN_API_KEY,
  },
  polyscan: {
    apiKey: process.env.POLYGONSCAN_API_KEY,
  },
};
