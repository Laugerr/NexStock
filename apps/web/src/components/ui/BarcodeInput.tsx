import { useState, useRef, useEffect, useCallback } from 'react'
import { ScanLine, Camera, X, Loader2 } from 'lucide-react'
import { clsx } from 'clsx'
import { Button } from './Button'

interface BarcodeInputProps {
  onScan: (barcode: string) => void
  label?: string
  placeholder?: string
  error?: string
  className?: string
  disabled?: boolean
}

export function BarcodeInput({
  onScan,
  label,
  placeholder = 'Scan or type barcode...',
  error,
  className,
  disabled,
}: BarcodeInputProps) {
  const [value, setValue] = useState('')
  const [cameraOpen, setCameraOpen] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const readerRef = useRef<import('@zxing/browser').BrowserMultiFormatReader | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const stopCamera = useCallback(() => {
    readerRef.current = null
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    setScanning(false)
    setCameraOpen(false)
  }, [])

  const startCamera = useCallback(async () => {
    setCameraError(null)
    setCameraOpen(true)
    setScanning(true)

    try {
      const { BrowserMultiFormatReader } = await import('@zxing/browser')
      const reader = new BrowserMultiFormatReader()
      readerRef.current = reader

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()

        reader.decodeFromStream(stream, videoRef.current, (result, err) => {
          if (result) {
            const text = result.getText()
            stopCamera()
            onScan(text)
          }
          if (err && err.name !== 'NotFoundException') {
            console.warn('Scan error:', err)
          }
        })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Camera access denied'
      setCameraError(msg)
      setScanning(false)
    }
  }, [onScan, stopCamera])

  // Cleanup on unmount
  useEffect(() => () => stopCamera(), [stopCamera])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && value.trim()) {
      e.preventDefault()
      onScan(value.trim())
      setValue('')
    }
  }

  return (
    <div className={clsx('flex flex-col gap-1', className)}>
      {label && <label className="text-sm font-medium text-gray-700">{label}</label>}

      <div className="flex gap-2">
        <div className="relative flex-1">
          <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className={clsx(
              'block w-full rounded-lg border py-2 pl-9 pr-3 text-sm shadow-sm transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-brand-500',
              error
                ? 'border-red-300 bg-red-50 focus:ring-red-400'
                : 'border-gray-300 bg-white focus:border-brand-500',
            )}
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          size="md"
          onClick={startCamera}
          disabled={disabled}
          title="Scan with camera"
        >
          <Camera className="h-4 w-4" />
        </Button>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}
      <p className="text-xs text-gray-400">Press Enter after typing or use a USB barcode scanner</p>

      {/* Camera modal */}
      {cameraOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="relative w-full max-w-sm rounded-2xl bg-white overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="font-semibold text-gray-900">Scan Barcode</h3>
              <button onClick={stopCamera} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="relative bg-black aspect-square">
              <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />

              {/* Scanning overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-48 h-48 border-2 border-brand-400 rounded-lg relative">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-brand-500 rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-brand-500 rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-brand-500 rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-brand-500 rounded-br-lg" />
                  {scanning && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-full h-0.5 bg-brand-500/60 animate-pulse" />
                    </div>
                  )}
                </div>
              </div>

              {scanning && (
                <div className="absolute bottom-4 inset-x-0 flex justify-center">
                  <div className="flex items-center gap-2 rounded-full bg-black/60 px-4 py-2 text-white text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Scanning...
                  </div>
                </div>
              )}
            </div>

            {cameraError && (
              <div className="p-4 bg-red-50 text-red-700 text-sm">
                <p className="font-medium">Camera error</p>
                <p>{cameraError}</p>
                <p className="mt-1 text-xs">Use a USB barcode scanner or type the barcode manually.</p>
              </div>
            )}

            <div className="p-4">
              <Button variant="secondary" className="w-full" onClick={stopCamera}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
