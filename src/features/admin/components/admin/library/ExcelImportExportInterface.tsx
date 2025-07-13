'use client'

import { useState, useRef } from 'react'
import { 
  Upload, 
  Download, 
  FileSpreadsheet, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  X,
  FileText
} from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Badge } from '@/shared/components/ui/badge'
import { Progress } from '@/shared/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/shared/components/ui/alert'
import { Separator } from '@/shared/components/ui/separator'

interface ImportResult {
  success: boolean
  created: {
    divisions: number
    sections: number
    assemblies: number
    items: number
  }
  errors: Array<{
    row: number
    message: string
    data?: any
  }>
  skipped: Array<{
    row: number
    reason: string
    code: string
  }>
}

interface ExcelImportExportInterfaceProps {
  isOpen: boolean
  onClose: () => void
  onImportSuccess: () => void
}

export function ExcelImportExportInterface({ 
  isOpen, 
  onClose, 
  onImportSuccess 
}: ExcelImportExportInterfaceProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [downloadingTemplate, setDownloadingTemplate] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (file: File) => {
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ]
    
    const validExtensions = ['.xlsx', '.xls', '.csv']
    const hasValidExtension = validExtensions.some(ext => 
      file.name.toLowerCase().endsWith(ext)
    )

    if (!validTypes.includes(file.type) && !hasValidExtension) {
      alert('Please select a valid Excel file (.xlsx, .xls) or CSV file (.csv)')
      return
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      alert('File size must be less than 10MB')
      return
    }

    setSelectedFile(file)
    setImportResult(null)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const downloadTemplate = async () => {
    setDownloadingTemplate(true)
    try {
      const response = await fetch('/api/admin/library/template/download')
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `Library_Import_Template_${new Date().toISOString().slice(0, 10)}.xlsx`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        alert('Failed to download template')
      }
    } catch (error) {
      console.error('Download error:', error)
      alert('Failed to download template')
    } finally {
      setDownloadingTemplate(false)
    }
  }

  const importFile = async () => {
    if (!selectedFile) return

    setImporting(true)
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const response = await fetch('/api/admin/library/import/excel', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()
      setImportResult(result)

      if (result.success) {
        onImportSuccess()
      }
    } catch (error) {
      console.error('Import error:', error)
      setImportResult({
        success: false,
        created: { divisions: 0, sections: 0, assemblies: 0, items: 0 },
        errors: [{ row: 0, message: 'Failed to import file. Please try again.' }],
        skipped: []
      })
    } finally {
      setImporting(false)
    }
  }

  const resetImport = () => {
    setSelectedFile(null)
    setImportResult(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const totalCreated = importResult ? 
    importResult.created.divisions + 
    importResult.created.sections + 
    importResult.created.assemblies + 
    importResult.created.items : 0

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            Excel Import/Export
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Import library items from Excel files or download the template
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Template Download Section */}
          <div className="space-y-3">
            <div className="border border-border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Download className="w-4 h-4 text-muted-foreground" />
                    <h3 className="text-sm font-medium">Excel Import Template</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Download structured template with examples and instructions
                  </p>
                  <div className="flex gap-2">
                    <Badge variant="secondary" className="text-xs">
                      3 Sheets
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      Sample Data
                    </Badge>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadTemplate}
                  disabled={downloadingTemplate}
                >
                  {downloadingTemplate ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                      Downloading
                    </>
                  ) : (
                    <>
                      <Download className="w-3 h-3 mr-2" />
                      Download
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          <Separator />

          {/* File Upload Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Upload className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-medium">Import from Excel</h3>
            </div>

            {!importResult && (
              <div className="space-y-3">
                {/* File Drop Zone */}
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                    dragOver 
                      ? 'border-primary bg-muted/50' 
                      : selectedFile 
                        ? 'border-green-500 bg-green-50' 
                        : 'border-border hover:border-muted-foreground'
                  }`}
                >
                  {selectedFile ? (
                    <div className="space-y-2">
                      <CheckCircle className="w-8 h-8 text-green-500 mx-auto" />
                      <div>
                        <p className="text-sm font-medium text-green-900">{selectedFile.name}</p>
                        <p className="text-xs text-green-700">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={resetImport}
                        className="text-green-700 hover:bg-green-100"
                      >
                        <X className="w-3 h-3 mr-1" />
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <FileSpreadsheet className="w-8 h-8 text-muted-foreground mx-auto" />
                      <div>
                        <p className="text-sm font-medium">
                          {dragOver ? 'Drop file here' : 'Drop file or click to browse'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          .xlsx, .xls, .csv (max 10MB)
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="w-3 h-3 mr-2" />
                        Choose File
                      </Button>
                    </div>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleFileSelect(file)
                  }}
                  className="hidden"
                />

                {/* Import Requirements */}
                <div className="bg-muted/30 border border-border rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Import Requirements</p>
                      <ul className="space-y-0.5 text-xs text-muted-foreground">
                        <li>• Use the provided template structure</li>
                        <li>• Supported formats: .xlsx, .xls, .csv (max 10MB)</li>
                        <li>• Duplicate codes will be skipped</li>
                        <li>• Invalid data will be reported with errors</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Import Results */}
            {importResult && (
              <div className="space-y-3">
                {importResult.success ? (
                  <div className="border border-green-200 bg-green-50/50 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <div>
                        <p className="text-sm font-medium text-green-800">Import Successful</p>
                        <p className="text-xs text-green-700">
                          Successfully imported {totalCreated} items to the library
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="border border-red-200 bg-red-50/50 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600" />
                      <div>
                        <p className="text-sm font-medium text-red-800">Import Failed</p>
                        <p className="text-xs text-red-700">
                          Import completed with errors. Review issues below
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Import Statistics */}
                <div className="grid grid-cols-4 gap-2">
                  <div className="border border-border rounded-lg p-2 text-center">
                    <p className="text-lg font-semibold">{importResult.created.divisions}</p>
                    <p className="text-xs text-muted-foreground">Divisions</p>
                  </div>
                  <div className="border border-border rounded-lg p-2 text-center">
                    <p className="text-lg font-semibold">{importResult.created.sections}</p>
                    <p className="text-xs text-muted-foreground">Sections</p>
                  </div>
                  <div className="border border-border rounded-lg p-2 text-center">
                    <p className="text-lg font-semibold">{importResult.created.assemblies}</p>
                    <p className="text-xs text-muted-foreground">Assemblies</p>
                  </div>
                  <div className="border border-border rounded-lg p-2 text-center">
                    <p className="text-lg font-semibold">{importResult.created.items}</p>
                    <p className="text-xs text-muted-foreground">Items</p>
                  </div>
                </div>

                {/* Skipped Items */}
                {importResult.skipped.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-orange-800">Skipped Items ({importResult.skipped.length})</p>
                    <div className="max-h-24 overflow-y-auto bg-orange-50/50 border border-orange-200 rounded-lg p-2">
                      {importResult.skipped.map((skip, index) => (
                        <div key={index} className="text-xs text-orange-700">
                          Row {skip.row}: {skip.code} - {skip.reason}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Errors */}
                {importResult.errors.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-red-800">Errors ({importResult.errors.length})</p>
                    <div className="max-h-24 overflow-y-auto bg-red-50/50 border border-red-200 rounded-lg p-2">
                      {importResult.errors.map((error, index) => (
                        <div key={index} className="text-xs text-red-700">
                          Row {error.row}: {error.message}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetImport}
                  className="w-full"
                >
                  Import Another File
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center border-t pt-3">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          
          {selectedFile && !importResult && !importing && (
            <Button size="sm" onClick={importFile}>
              <Upload className="w-3 h-3 mr-2" />
              Import File
            </Button>
          )}

          {importing && (
            <Button size="sm" disabled>
              <Loader2 className="w-3 h-3 mr-2 animate-spin" />
              Importing...
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}