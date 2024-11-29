import NFTGenerator from "@/components/NFTGenerator";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center border-b pb-4">
          <h1 className="text-3xl font-bold">AI-Powered NFT Generator</h1>
        </div>
        <NFTGenerator />
      </div>
    </main>
  );
}
