const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("NFTGeneratorModule", (m: any) => {
  const nftGenerator = m.contract("NFTGenerator");

  return {
    nftGenerator,
  };
});
