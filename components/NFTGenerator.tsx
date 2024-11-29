"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";
import { useAccount, useWriteContract } from "wagmi";
import { parseEther } from "viem";
import { useWeb3Modal } from "@web3modal/wagmi/react";
import { Trash2, Archive, Info } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

const NFT_ABI = [
  {
    inputs: [
      { internalType: "address", name: "recipient", type: "address" },
      { internalType: "string", name: "tokenURI", type: "string" },
    ],
    name: "mintNFT",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "payable",
    type: "function",
  },
] as const;

const CONTRACT_ADDRESS = process.env
  .NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`;

interface GeneratedImage {
  imageUrl: string;
  originalPrompt: string;
  title: string;
  enhancedPrompt: string;
  description: string;
  attributes: {
    trait_type: string;
    value: string;
  }[];
  timestamp: number;
  archived?: boolean;
}

export default function NFTGenerator() {
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isMinting, setIsMinting] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [description, setDescription] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [currentImage, setCurrentImage] = useState<GeneratedImage | null>(null);
  const [flippedCards, setFlippedCards] = useState<Record<number, boolean>>({});

  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const { open } = useWeb3Modal();

  useEffect(() => {
    // Load saved images from localStorage
    const savedImages = localStorage.getItem("generatedImages");
    if (savedImages) {
      setGeneratedImages(JSON.parse(savedImages));
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/predictions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.imageUrl) {
        setImageUrl(data.imageUrl);
        setDescription(data.description);

        // Create new image with full metadata
        const newImage = {
          imageUrl: data.imageUrl,
          originalPrompt: data.originalPrompt,
          title: data.title,
          enhancedPrompt: data.enhancedPrompt,
          description: data.description,
          attributes: data.attributes,
          timestamp: Date.now(),
          archived: false,
        };

        // Update current image and stored images
        setCurrentImage(newImage);
        const updatedImages = [newImage, ...generatedImages];
        setGeneratedImages(updatedImages);
        localStorage.setItem("generatedImages", JSON.stringify(updatedImages));
      } else {
        throw new Error("No image URL in response");
      }
    } catch (err) {
      console.error("Error generating NFT:", err);
      setError(err instanceof Error ? err.message : "Failed to generate NFT");
    } finally {
      setIsLoading(false);
    }
  };

  const handleMint = async (mintImageUrl: string, mintDescription: string) => {
    if (!isConnected) {
      await open();
      return;
    }

    if (!address || !mintImageUrl || !mintDescription) return;

    setIsMinting(true);
    setError(null);

    try {
      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageUrl: mintImageUrl,
          description: mintDescription,
        }),
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload to IPFS");
      }

      const { url: metadataUrl } = await uploadResponse.json();

      await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: NFT_ABI,
        functionName: "mintNFT",
        args: [address, metadataUrl],
        value: parseEther("0.001"),
      });
    } catch (err) {
      console.error("Error minting NFT:", err);
      setError(err instanceof Error ? err.message : "Failed to mint NFT");
    } finally {
      setIsMinting(false);
    }
  };

  const handleConnect = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    await open();
  };

  const handleDelete = (timestamp: number) => {
    const updatedImages = generatedImages.filter(
      (img) => img.timestamp !== timestamp
    );
    setGeneratedImages(updatedImages);
    localStorage.setItem("generatedImages", JSON.stringify(updatedImages));
  };

  const handleArchive = (timestamp: number) => {
    const updatedImages = generatedImages.map((img) =>
      img.timestamp === timestamp ? { ...img, archived: !img.archived } : img
    );
    setGeneratedImages(updatedImages);
    localStorage.setItem("generatedImages", JSON.stringify(updatedImages));
  };

  const filteredImages = generatedImages.filter(
    (img) => img.archived === showArchived
  );

  const handleCardClick = (image: GeneratedImage) => {
    setImageUrl(image.imageUrl);
    setCurrentImage(image);
    // Scroll to top smoothly
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleCardFlip = (timestamp: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click when clicking flip button
    setFlippedCards((prev) => ({
      ...prev,
      [timestamp]: !prev[timestamp],
    }));
  };

  const renderMetadataCard = (img: GeneratedImage) => (
    <Card className="bg-muted/50">
      <CardContent className="pt-6 space-y-4">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">NFT Metadata</h3>
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">
                Title
              </h4>
              <p className="text-sm">{img.title}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">
                Original Prompt
              </h4>
              <p className="text-sm">{img.originalPrompt}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">
                Enhanced Prompt
              </h4>
              <p className="text-sm">{img.enhancedPrompt}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">
                Description
              </h4>
              <p className="text-sm">{img.description}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">
                Attributes
              </h4>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {img.attributes.map((attr) => (
                  <div
                    key={attr.trait_type}
                    className="bg-background rounded-md p-2 text-sm"
                  >
                    <span className="font-medium">{attr.trait_type}:</span>{" "}
                    {attr.value}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderFlipCard = (img: GeneratedImage) => {
    const isFlipped = flippedCards[img.timestamp] || false;

    return (
      <div
        className="relative w-full aspect-square cursor-pointer group"
        onClick={() => handleCardClick(img)}
      >
        <div
          className={`w-full h-full transition-all duration-500 preserve-3d ${
            isFlipped ? "rotate-y-180" : ""
          }`}
        >
          {/* Front of card */}
          <div className="absolute w-full h-full backface-hidden">
            <div className="relative w-full h-full">
              <Image
                src={img.imageUrl}
                alt={img.title}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="object-cover rounded-lg"
              />
              <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="outline"
                  size="icon"
                  className="bg-white/90 hover:bg-white dark:bg-black/90 dark:hover:bg-black"
                  onClick={(e) => toggleCardFlip(img.timestamp, e)}
                >
                  <Info className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="bg-white/90 hover:bg-white dark:bg-black/90 dark:hover:bg-black"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleArchive(img.timestamp);
                  }}
                >
                  <Archive className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="bg-white/90 hover:bg-white dark:bg-black/90 dark:hover:bg-black text-red-600 hover:text-red-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(img.timestamp);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent text-white rounded-b-lg">
                <h3 className="text-lg font-semibold truncate">{img.title}</h3>
              </div>
            </div>
          </div>

          {/* Back of card */}
          <div className="absolute w-full h-full backface-hidden rotate-y-180 bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-y-auto">
            <div className="p-4 space-y-3">
              <h3 className="text-lg font-semibold">{img.title}</h3>
              <div className="space-y-2">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Original Prompt
                  </h4>
                  <p className="text-sm">{img.originalPrompt}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Attributes
                  </h4>
                  <div className="grid grid-cols-2 gap-1 mt-1">
                    {img.attributes.map((attr) => (
                      <div
                        key={attr.trait_type}
                        className="bg-muted/50 rounded-md p-1 text-xs"
                      >
                        <span className="font-medium">{attr.trait_type}:</span>{" "}
                        {attr.value}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="pt-2 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => toggleCardFlip(img.timestamp, e)}
                  className="w-full"
                >
                  Back to Image
                </Button>
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMint(img.imageUrl, img.description);
                  }}
                  className="w-full"
                  disabled={isMinting || !isConnected}
                >
                  Mint
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="py-8">
      {/* Header with Connect Wallet and Theme Toggle */}
      <div className="fixed top-4 right-4 sm:right-8 flex items-center gap-4 z-50">
        <ThemeToggle />
        <w3m-button
          size="md"
          label={
            isConnected
              ? `Connected: ${address?.slice(0, 6)}...${address?.slice(-4)}`
              : "Connect Wallet"
          }
        />
      </div>

      {/* Generator Section */}
      <div className="space-y-8">
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Generate Your NFT</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  placeholder="Describe your NFT idea..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  disabled={isLoading}
                />
                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? "Generating..." : "Generate Image"}
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="text-red-500 p-4 bg-red-50 rounded-lg">{error}</div>
        )}

        {/* Current Generation */}
        {currentImage && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="relative w-full aspect-square max-h-[400px]">
                  <Image
                    src={currentImage.imageUrl}
                    alt={currentImage.title}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-contain rounded-lg"
                    priority
                  />
                </div>
                <div className="pt-4">
                  <Button
                    onClick={() =>
                      handleMint(
                        currentImage.imageUrl,
                        currentImage.description
                      )
                    }
                    className="w-full"
                    disabled={isMinting || !isConnected}
                  >
                    {isMinting ? "Minting..." : "Mint NFT (0.001 ETH)"}
                  </Button>
                </div>
              </CardContent>
            </Card>
            {renderMetadataCard(currentImage)}
          </div>
        )}

        {/* Previous Generations */}
        {generatedImages.length > 0 && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">
                {showArchived ? "Archived Generations" : "Previous Generations"}
              </h2>
              <Button
                variant="outline"
                onClick={() => setShowArchived(!showArchived)}
              >
                {showArchived ? "Show Active" : "Show Archived"}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredImages.map((img) => (
                <div key={img.timestamp}>{renderFlipCard(img)}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
