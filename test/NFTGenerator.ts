import { expect } from "chai";
import { ethers } from "hardhat";
import { NFTGenerator } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("NFTGenerator", function () {
  let nftGenerator: NFTGenerator;
  let owner: HardhatEthersSigner;
  let addr1: HardhatEthersSigner;

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();
    const NFTGenerator = await ethers.getContractFactory("NFTGenerator");
    nftGenerator = await NFTGenerator.deploy();
  });

  describe("Minting", function () {
    it("Should mint a new NFT", async function () {
      const mintPrice = await nftGenerator.mintPrice();
      await nftGenerator
        .connect(addr1)
        .mintNFT(addr1.address, "ipfs://test-uri", { value: mintPrice });

      expect(await nftGenerator.ownerOf(1)).to.equal(addr1.address);
    });

    it("Should fail if payment is insufficient", async function () {
      const mintPrice = await nftGenerator.mintPrice();
      await expect(
        nftGenerator
          .connect(addr1)
          .mintNFT(addr1.address, "ipfs://test-uri", {
            value: mintPrice.sub(1),
          })
      ).to.be.revertedWith("Insufficient payment");
    });
  });

  describe("Admin functions", function () {
    it("Should allow owner to set mint price", async function () {
      const newPrice = ethers.parseEther("0.02");
      await nftGenerator.connect(owner).setMintPrice(newPrice);
      expect(await nftGenerator.mintPrice()).to.equal(newPrice);
    });

    it("Should not allow non-owner to set mint price", async function () {
      const newPrice = ethers.parseEther("0.02");
      await expect(
        nftGenerator.connect(addr1).setMintPrice(newPrice)
      ).to.be.revertedWithCustomError(
        nftGenerator,
        "OwnableUnauthorizedAccount"
      );
    });
  });
});
