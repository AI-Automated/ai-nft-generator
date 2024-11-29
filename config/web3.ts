import { createConfig, http } from "wagmi";
import { sepolia, mainnet } from "wagmi/chains";
import { createWeb3Modal } from "@web3modal/wagmi/react";

const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || "";

const metadata = {
  name: "NFT Generator",
  description: "Generate and mint AI-powered NFTs",
  url: "https://nft-generator.com",
  icons: ["https://avatars.githubusercontent.com/u/37784886"],
};

export const config = createConfig({
  chains: [sepolia, mainnet],
  transports: {
    [sepolia.id]: http(),
    [mainnet.id]: http(),
  },
});

createWeb3Modal({
  wagmiConfig: config,
  projectId,
  themeMode: "dark",
  themeVariables: {
    "--w3m-accent": "rgb(59, 130, 246)",
  },
});
