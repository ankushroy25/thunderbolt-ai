import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function LandingPage() {
  const [prompt, setPrompt] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      navigate("/builder", { state: { prompt } });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white sm:text-6xl">
            Create Your Dream Website
          </h1>
          <p className="mt-4 text-xl text-gray-600 dark:text-gray-300">
            Describe your website and let AI handle the rest
          </p>

          <form onSubmit={handleSubmit} className="mt-12 max-w-xl mx-auto">
            <div className="flex flex-col gap-4">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your website..."
                className="w-full h-32 p-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <button
                type="submit"
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Generate Website
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
