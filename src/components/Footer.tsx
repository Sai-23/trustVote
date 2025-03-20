export function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-8">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <h2 className="text-xl font-bold">BlockVote</h2>
            <p className="text-gray-400 mt-1">Secure blockchain voting platform</p>
          </div>
          <div className="text-gray-400 text-sm">&copy; {new Date().getFullYear()} BlockVote. All rights reserved.</div>
        </div>
      </div>
    </footer>
  )
}

