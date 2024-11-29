// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract NFTGenerator is ERC721URIStorage, Ownable {
    uint256 private _tokenIds;
    uint256 public mintPrice = 0.001 ether;
    
    constructor() ERC721("AI Generated NFT", "AINFT") Ownable(msg.sender) {}
    
    function mintNFT(address recipient, string memory tokenURI) 
        public 
        payable 
        returns (uint256) 
    {
        require(msg.value >= mintPrice, "Insufficient payment");
        
        _tokenIds++;
        uint256 newItemId = _tokenIds;
        _mint(recipient, newItemId);
        _setTokenURI(newItemId, tokenURI);

        return newItemId;
    }

    function setMintPrice(uint256 _price) public onlyOwner {
        mintPrice = _price;
    }

    function withdraw() public onlyOwner {
        uint256 balance = address(this).balance;
        payable(owner()).transfer(balance);
    }

} 
