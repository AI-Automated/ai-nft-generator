import { NextResponse } from "next/server";
import FormData from "form-data";
import axios from "axios";
import crypto from "crypto";

// You'll need these environment variables
const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_SECRET_KEY = process.env.PINATA_SECRET_KEY;

export async function POST(req: Request) {
  try {
    const { imageUrl, description } = await req.json();

    // Generate a unique identifier for this NFT
    const uniqueId = crypto.randomBytes(8).toString("hex");
    const nftName = `AI Generated NFT ${uniqueId}`;

    // 1. First upload the image
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();

    // Upload image to Pinata with a unique name
    const formData = new FormData();
    formData.append("file", Buffer.from(imageBuffer), {
      filename: `${uniqueId}.png`,
      contentType: "image/png",
    });

    // Add metadata to the image file upload
    const imageMetadata = JSON.stringify({
      name: `${uniqueId}.png`,
      keyvalues: {
        uniqueId: uniqueId,
        type: "image",
      },
    });
    formData.append("pinataMetadata", imageMetadata);

    // Add options to keep the original filename
    const pinataOptions = JSON.stringify({
      cidVersion: 0,
      customPinPolicy: {
        regions: [
          {
            id: "FRA1",
            desiredReplicationCount: 1,
          },
        ],
      },
    });
    formData.append("pinataOptions", pinataOptions);

    const imageUploadRes = await axios.post(
      "https://api.pinata.cloud/pinning/pinFileToIPFS",
      formData,
      {
        headers: {
          "Content-Type": `multipart/form-data; boundary=${formData.getBoundary()}`,
          pinata_api_key: PINATA_API_KEY,
          pinata_secret_api_key: PINATA_SECRET_KEY,
        },
      }
    );

    // 2. Create and upload the metadata
    const metadata = {
      name: nftName,
      description: description,
      // Use gateway URL for better compatibility
      image: `ipfs://${imageUploadRes.data.IpfsHash}`,
      external_url: `https://gateway.pinata.cloud/ipfs/${imageUploadRes.data.IpfsHash}`,
      attributes: [
        {
          trait_type: "Generation ID",
          value: uniqueId,
        },
        {
          trait_type: "Created At",
          value: new Date().toISOString(),
        },
      ],
    };

    const metadataRes = await axios.post(
      "https://api.pinata.cloud/pinning/pinJSONToIPFS",
      {
        pinataContent: metadata,
        pinataMetadata: {
          name: `${uniqueId}-metadata.json`,
          keyvalues: {
            uniqueId: uniqueId,
            type: "metadata",
          },
        },
        pinataOptions: {
          cidVersion: 0,
        },
      },
      {
        headers: {
          "Content-Type": "application/json",
          pinata_api_key: PINATA_API_KEY,
          pinata_secret_api_key: PINATA_SECRET_KEY,
        },
      }
    );

    return NextResponse.json({
      url: `ipfs://${metadataRes.data.IpfsHash}`,
      name: nftName,
      imageUrl: `ipfs://${imageUploadRes.data.IpfsHash}`,
    });
  } catch (error) {
    console.error("Error uploading to IPFS:", error);
    return NextResponse.json(
      { error: "Failed to upload to IPFS" },
      { status: 500 }
    );
  }
}
