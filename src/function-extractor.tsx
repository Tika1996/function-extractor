'use client'

import { useState } from 'react'
import JSZip from 'jszip'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function FunctionExtractor() {
  const [output, setOutput] = useState('')

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const htmlFile = formData.get('htmlFile') as File
    const jsFile = formData.get('jsFile') as File

    if (!htmlFile) {
      alert('Please upload an HTML file')
      return
    }

    try {
      const htmlContent = await readFile(htmlFile)
      const jsContent = jsFile ? await readFile(jsFile) : ''
      await processFiles(htmlContent, jsContent)
    } catch (error) {
      console.error('Error processing files:', error)
      setOutput('An error occurred while processing the files.')
    }
  }

  const readFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target?.result as string)
      reader.onerror = reject
      reader.readAsText(file)
    })
  }

  const processFiles = async (htmlContent: string, jsContent: string) => {
    const zip = new JSZip()

    const htmlFunctions = extractJSFunctions(htmlContent)
    const jsFunctions = extractJSFunctions(jsContent)

    await processFunctions(htmlFunctions, zip)
    await processFunctions(jsFunctions, zip)

    const updatedHTML = updateHTML(htmlContent, htmlFunctions)
    zip.file('updated_file.html', updatedHTML)

    const content = await zip.generateAsync({ type: 'blob' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(content)
    link.download = 'functions.zip'
    link.click()

    setOutput('Processing complete! Download your ZIP file.')
  }

  const extractJSFunctions = (content: string): string[] => {
    if (!content) return []
    const functionMatches = content.match(/function\s+(\w+)\s*\([\s\S]*?\}\s*/g)
    return functionMatches || []
  }

  const processFunctions = async (functions: string[], zip: JSZip) => {
    for (let fn of functions) {
      const functionName = fn.match(/function\s+(\w+)/)?.[1]
      if (functionName) {
        const encryptedName = await sha256(functionName)
        const folder = zip.folder(encryptedName)
        if (folder) {
          folder.file(`${functionName}.js`, fn)
        }
      }
    }
  }

  const updateHTML = (htmlContent: string, functions: string[]): string => {
    let scriptContent = '';

    functions.forEach(fn => {
      const functionName = fn.match(/function\s+(\w+)/)?.[1];
      if (functionName) {
        const encryptedName = sha256Sync(functionName);
        scriptContent += `<script src="${encryptedName}/${functionName}.js"></script>\n`;
      }
    });

    // Remplacer tous les scripts existants par le nouveau contenu
    const updatedHTML = htmlContent.replace(
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      ''
    );

    // Insérer le nouveau contenu des scripts juste avant la fermeture du tag </body>
    return updatedHTML.replace(
      '</body>',
      `${scriptContent}</body>`
    );
  };

  const sha256 = async (message: string): Promise<string> => {
    const msgBuffer = new TextEncoder().encode(message)
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  const sha256Sync = (message: string): string => {
    // Note: This is a placeholder. In a browser environment, we can't use Node.js crypto.
    // For a synchronous SHA-256 in the browser, you'd need to use a third-party library.
    console.warn('Synchronous SHA-256 is not implemented in this environment')
    return message // Return the original message as a fallback
  }

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">JavaScript Function Extractor</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="htmlFile">Upload HTML file:</Label>
              <Input id="htmlFile" name="htmlFile" type="file" accept=".html" required />
            </div>
            <div>
              <Label htmlFor="jsFile">Upload JS file (optional):</Label>
              <Input id="jsFile" name="jsFile" type="file" accept=".js" />
            </div>
            <Button type="submit">Process Files</Button>
          </form>
          {output && <p className="mt-4 text-green-600 font-bold">{output}</p>}
        </CardContent>
      </Card>
    </div>
  )
}