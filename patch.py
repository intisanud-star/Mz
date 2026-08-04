with open('src/App.tsx', 'r') as f:
    content = f.read()

target1 = """  const handleDownloadCertificate = async (certificateData: any, type: string) => {
    if (!certificateRef.current) return;
    setIsExporting(true);
    try {
      const dataUrl = await toPng(certificateRef.current, {"""

replacement1 = """  const handleDownloadCertificate = async (certificateData: any, type: string) => {
    if (!certificateRef.current) return;
    setIsExporting(true);
    try {
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(certificateRef.current, {"""

target2 = """  const handleExportCustomApp = async () => {
    if (!customAppPreviewRef.current) return;
    setIsExporting(true);
    try {
      const dataUrl = await toPng(customAppPreviewRef.current, {"""

replacement2 = """  const handleExportCustomApp = async () => {
    if (!customAppPreviewRef.current) return;
    setIsExporting(true);
    try {
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(customAppPreviewRef.current, {"""

if target1 in content:
    content = content.replace(target1, replacement1)
if target2 in content:
    content = content.replace(target2, replacement2)
    
with open('src/App.tsx', 'w') as f:
    f.write(content)
print("Patched other toPng uses")
