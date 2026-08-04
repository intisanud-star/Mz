with open('src/App.tsx', 'r') as f:
    content = f.read()

target = """                {/* <button 
                  onClick={handleDownloadReceipt}
                  disabled={isExporting}
                  className="w-full py-5 bg-ink text-white rounded-[2rem] font-bold text-xs uppercase tracking-[0.2em] hover:scale-[1.02] transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                >
                  {isExporting ? (
                    <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Download size={18} />
                  )}
                  {isExporting ? 'Generating...' : 'Save as Image'}
                </button> */}"""

replacement = """                <button 
                  onClick={handleDownloadReceipt}
                  disabled={isExporting}
                  className="w-full py-5 bg-ink text-white rounded-[2rem] font-bold text-xs uppercase tracking-[0.2em] hover:scale-[1.02] transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                >
                  {isExporting ? (
                    <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Download size={18} />
                  )}
                  {isExporting ? 'Generating...' : 'Save as Image'}
                </button>"""

if target in content:
    with open('src/App.tsx', 'w') as f:
        f.write(content.replace(target, replacement))
    print("Patched successfully")
else:
    print("Target not found.")
