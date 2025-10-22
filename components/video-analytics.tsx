"use client"
import { useState } from "react"
import type React from "react"

import { Upload, FileVideo, Loader2, CheckCircle2, AlertCircle } from "lucide-react"

export default function VideoAnalytics() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile && selectedFile.type.startsWith("video/")) {
      setFile(selectedFile)
      setError(null)
      setResult(null)
    } else {
      setError("Please select a valid video file")
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a video file first")
      return
    }

    setLoading(true)
    setError(null)

    const formData = new FormData()
    formData.append("video", file)

    try {
      const response = await fetch("/api/analyze-video", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to analyze video")
      }

      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">Video Analytics</h1>
          <p className="text-slate-300 text-lg">Upload a video to get transcription and AI-powered analytics</p>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20">
          <div className="mb-8">
            <label
              htmlFor="video-upload"
              className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-purple-400 rounded-xl cursor-pointer bg-white/5 hover:bg-white/10 transition-all duration-300"
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                {file ? (
                  <>
                    <FileVideo className="w-16 h-16 text-purple-400 mb-4" />
                    <p className="text-white font-medium mb-2">{file.name}</p>
                    <p className="text-slate-400 text-sm">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                  </>
                ) : (
                  <>
                    <Upload className="w-16 h-16 text-purple-400 mb-4" />
                    <p className="mb-2 text-white font-medium">Click to upload video</p>
                    <p className="text-slate-400 text-sm">MP4, MOV, AVI, WebM (Max 100MB)</p>
                  </>
                )}
              </div>
              <input id="video-upload" type="file" className="hidden" accept="video/*" onChange={handleFileChange} />
            </label>
          </div>

          <button
            onClick={handleUpload}
            disabled={!file || loading}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold py-4 px-6 rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                Analyze Video
              </>
            )}
          </button>

          {error && (
            <div className="mt-6 bg-red-500/20 border border-red-500 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-200">{error}</p>
            </div>
          )}

          {result && (
            <div className="mt-8 space-y-6">
              <div className="bg-green-500/20 border border-green-500 rounded-lg p-4 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                <p className="text-green-200 font-medium">Analysis Complete!</p>
              </div>

              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <h3 className="text-xl font-semibold text-white mb-4">Transcription</h3>
                <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{result.transcript}</p>
              </div>

              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <h3 className="text-xl font-semibold text-white mb-4">Analytics & Insights</h3>
                <div className="text-slate-300 leading-relaxed whitespace-pre-wrap">{result.analytics}</div>
              </div>

              {result.metadata && (
                <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                  <h3 className="text-xl font-semibold text-white mb-4">Metadata</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-400">File Size</p>
                      <p className="text-white font-medium">{result.metadata.fileSize}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">File Type</p>
                      <p className="text-white font-medium">{result.metadata.mimeType}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
