import Link from "next/link"

export function Hero() {
  return (
    <div className="flex-1 bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Secure and Transparent Blockchain Voting
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Cast your vote with confidence using our decentralized voting platform. Powered by blockchain technology for
            maximum security and transparency.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/vote"
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
            >
              Cast Your Vote
            </Link>
            <Link
              href="/results"
              className="bg-white hover:bg-gray-100 text-blue-600 font-medium py-3 px-6 rounded-lg border border-blue-200 transition-colors"
            >
              View Results
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

