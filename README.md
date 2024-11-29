# AI NFT Generator

A full-stack dApp that allows users to generate and mint AI-powered NFTs using natural language prompts. Built with Next.js, Hardhat, and integrated with Replicate's AI image generation.

## Features

- 🎨 AI-powered image generation from text prompts
- 🔗 Automatic IPFS upload via Pinata
- 💎 Direct NFT minting on Ethereum (Sepolia testnet)
- 🌓 Dark/Light mode support
- 💫 Responsive, animated UI with card flipping effects
- 🔒 Rate limiting for API endpoints
- 🎭 Web3Modal integration for wallet connection

## Tech Stack

- **Frontend**: Next.js 15, React, TailwindCSS, shadcn/ui
- **Smart Contracts**: Solidity, Hardhat, OpenZeppelin
- **Web3**: wagmi, viem, Web3Modal
- **AI/Storage**: Replicate API, Pinata IPFS
- **Infrastructure**: Vercel, Upstash Redis

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm
- A wallet with some Sepolia ETH for minting

### Installation

1. Clone the repository:

git clone https://github.com/AI-Automated/ai-nft-generator.git

2. Install Dependencies:

```bash
pnpm install

```


3. Create a `.env` file in the root directory with the following variables:
```env
## API Keys
REPLICATE_API_TOKEN=
PINATA_API_KEY=
PINATA_SECRET_KEY=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

### Web3
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=
NEXT_PUBLIC_CONTRACT_ADDRESS=
PRIVATE_KEY=
SEPOLIA_RPC_URL=
ETHERSCAN_API_KEY=
```

4. Start the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Smart Contract

The NFT contract is deployed on Sepolia testnet and includes:

- ERC721 standard implementation
- Metadata URI storage
- Configurable mint price (default 0.001 ETH)
- Owner-only administrative functions

### Deployment

To deploy the contract to Sepolia:

```bash
pnpm hardhat ignition deploy ignition/modules/NFTGenerator.ts --network sepolia
```

## Usage

1. Connect your wallet using the button in the top right
2. Enter a descriptive prompt for your NFT
3. Wait for the AI to generate your image
4. Review the generated image and metadata
5. Click "Mint NFT" to mint it on-chain (requires 0.001 ETH + gas)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [Replicate](https://replicate.com/) for AI image generation
- [Pinata](https://pinata.cloud/) for IPFS hosting
- [OpenZeppelin](https://www.openzeppelin.com/) for smart contract standards
- [shadcn/ui](https://ui.shadcn.com/) for UI components
