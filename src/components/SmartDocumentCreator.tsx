import React, { useState } from 'react';
import { 
  Sparkles, Award, IdCard, Receipt, FileText, FileSignature, 
  FileSpreadsheet, User, ChevronDown, Check, Printer, 
  CloudDownload, ArrowRightLeft, Plus, Trash2, Globe, Phone, Mail, MapPin, 
  Activity, Tag, BarChart3, TrendingUp, ShieldCheck, ShieldAlert,
  Palette, Layers, Sliders, Maximize2, Lock, Unlock, Eye, EyeOff, Grid, Square, Circle, Type, AlignLeft, AlignCenter, AlignRight, Ruler, RefreshCw, Layers2,
  Camera, Upload
} from 'lucide-react';

interface SmartDocumentCreatorProps {
  documentTemplate: 'cv' | 'id-card' | 'report' | 'certificate' | 'agreement' | 'invoice' | 'receipt' | 'coreldraw';
  onTemplateChange: (type: 'cv' | 'id-card' | 'report' | 'certificate' | 'agreement' | 'invoice' | 'receipt' | 'coreldraw') => void;
  docData: any;
  setDocData: React.Dispatch<React.SetStateAction<any>>;
  docAiPrompt: string;
  setDocAiPrompt: (val: string) => void;
  isDocGenerating: boolean;
  setIsDocGenerating: (val: boolean) => void;
  setEditorContent: (val: string) => void;
  setEditorMode: (mode: 'standard' | 'smart') => void;
  showNotification: (msg: string, type?: 'success' | 'error' | 'info') => void;
  user: any;
  database: any;
  addDoc: any;
  collection: any;
  serverTimestamp: any;
}

export default function SmartDocumentCreator({
  documentTemplate,
  onTemplateChange,
  docData,
  setDocData,
  docAiPrompt,
  setDocAiPrompt,
  isDocGenerating,
  setIsDocGenerating,
  setEditorContent,
  setEditorMode,
  showNotification,
  user,
  database,
  addDoc,
  collection,
  serverTimestamp
}: SmartDocumentCreatorProps) {

  const [isScanning, setIsScanning] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Design scan / layout image parser
  const handleDesignImageScan = async (file: File) => {
    if (!file) return;
    
    // Check if it's an image
    if (!file.type.startsWith('image/')) {
      showNotification('Please upload a valid image file', 'error');
      return;
    }

    setIsScanning(true);
    showNotification('AI starting visual matrix scan of design template...', 'info');

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/ai/scan-design', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      if (data.success) {
        // Change template
        onTemplateChange(data.templateType);
        
        // Auto update data fields
        setDocData(data.docData);

        // Update auto fill prompt
        setDocAiPrompt(data.reconstructionPrompt);

        showNotification(
          `Scan complete! Detected target template: ${data.templateType.toUpperCase()} (${(data.confidence * 100).toFixed(0)}% accuracy). Fields successfully filled!`,
          'success'
        );
      } else {
        throw new Error(data.error || 'Failed to analyze design template');
      }
    } catch (err: any) {
      console.error(err);
      showNotification('Scan failed: ' + (err.message || 'Check your internet or API credentials'), 'error');
    } finally {
      setIsScanning(false);
    }
  };

  // Category Selector
  const categories = [
    { id: 'cv', label: 'CV/Resume', icon: User, color: 'bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-100' },
    { id: 'id-card', label: 'ID Card', icon: IdCard, color: 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100' },
    { id: 'report', label: 'Formal Report', icon: FileText, color: 'bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100' },
    { id: 'certificate', label: 'Certificate', icon: Award, color: 'bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100' },
    { id: 'agreement', label: 'Agreement', icon: FileSignature, color: 'bg-sky-50 text-sky-600 border-sky-100 hover:bg-sky-100' },
    { id: 'invoice', label: 'Invoice', icon: FileSpreadsheet, color: 'bg-violet-50 text-violet-600 border-violet-100 hover:bg-violet-105' },
    { id: 'receipt', label: 'Receipt', icon: Receipt, color: 'bg-teal-50 text-teal-600 border-teal-100 hover:bg-teal-100' },
    { id: 'coreldraw', label: 'CorelDRAW AI', icon: Palette, color: 'bg-pink-50 text-pink-600 border-pink-100 hover:bg-pink-100' }
  ];

  // Presets mapping based on categories
  const presets: Record<string, string[]> = {
    cv: [
      "Create a Full Stack Engineer resume for Lord Musa Mustapha, React/TypeScript expert, with 4 years experience at Exona Digital and a First Class Computer Science BSc degree.",
      "Generate a UI/UX designer CV for Sarah Jenkins, skilled in Figma, Design Systems, and CSS layouts, with 3 years leading premium digital brand strategies."
    ],
    'id-card': [
      "Staff ID Card for Lord Musa Mustapha. Group CEO of Exona Industries, Department: Executive Management. Blood group: AB+, Staff ID: EX-7711-CEO.",
      "Visitor Pass for Sophia Jenkins, Visiting Auditor from PremiumTrust Bank on May 24th, 2026. Credentials: VISITOR-99-A, Security Tier: A1."
    ],
    report: [
      "Build a monthly performance audit report for Exona Q1 showing £142.5k revenue (UP 25%), clean audit trials (STABLE 99.8%), and only £3.2k outstanding dues."
    ],
    certificate: [
      "Award of Excellence for Intisanud for Mastering Records & Blockchain Ledger course completed today. Signed by Lord Musa Mustapha, CEO Exona Academy.",
      "Certificate of Completion for Musa Mustapha who attended the 3-day Smart Contract and AI Workspace workshop in London Canary Wharf."
    ],
    agreement: [
      "Consultancy Agreement between Exona Digital Ltd (Provider) and Sarah Jenkins (Consultant). Sarah to deliver 15 hours design consulting/week at £120/hr, starting June 2026.",
      "Non-Disclosure Agreement (NDA) between Exona and PremiumTrust Bank to secure proprietary verification databases, effective May 2026."
    ],
    invoice: [
      "Invoice from Exona Ltd to PremiumTrust Bank. Include 120 hours of Software Auditing at £125/hr, and 1 Workspace Deployment Workshop at £4,500. Add 20% VAT.",
      "Invoice from CreativeDesigns to Exona. Design Consultancy Services retainer for £3,500. Terms code: Net 30."
    ],
    receipt: [
      "Receipt for Lord Musa Mustapha for paying £804.00 total for 1 Year Pro Workspace Membership and Smart Document Creator Addon. Paid by Credit Card."
    ],
    coreldraw: [
      "Generate a modern dark luxury Business Card for Musa Mustapha with glowing amber contour outlines, star design emblem, vertical coordinate dimension labels, and a neon cyber background.",
      "Draw an elegant retro poster for London tech summit featuring layered orange circular grids, offset vectors, a large radial gradient star badge in the center, and technical size indicators.",
      "Create a sleek minimalist Instagram post layout. Pitch-black backdrop, central white rounded card element, neon blue drop shadows, dual measuring lines (W: 560px), and styled label tags."
    ]
  };

  // Convert current docState to Raw Markdown helper
  const convertDataToMarkdown = () => {
    let md = '';
    const d = docData;

    if (documentTemplate === 'cv') {
      md = `# ${d.fullName || 'Full Name'}\n`;
      md += `**${d.jobTitle || 'Job Title'}**\n\n`;
      md += `📧 ${d.email || ''} | 📱 ${d.phone || ''} | 🌐 ${d.website || ''} | 📍 ${d.address || ''}\n\n`;
      md += `## Professional Summary\n${d.summary || ''}\n\n`;
      
      md += `## Experience\n`;
      if (Array.isArray(d.experience)) {
        d.experience.forEach((e: any) => {
          md += `### ${e.role} — ${e.company}\n_${e.period || ''}_\n${e.description || ''}\n\n`;
        });
      }
      
      md += `## Education\n`;
      if (Array.isArray(d.education)) {
        d.education.forEach((edu: any) => {
          md += `### ${edu.degree}\n_${edu.institution} | ${edu.period || ''}_\n${edu.description || ''}\n\n`;
        });
      }
      
      md += `## Key Skills\n`;
      if (Array.isArray(d.skills)) {
        md += d.skills.map((s: string) => `- ${s}`).join('\n') + '\n\n';
      }

      md += `## Projects\n`;
      if (Array.isArray(d.projects)) {
        d.projects.forEach((p: any) => {
          md += `### ${p.name}\n${p.description || ''}\n${p.link ? `[Project Link](${p.link})\n` : ''}\n`;
        });
      }

      md += `## Languages\n`;
      if (Array.isArray(d.languages)) {
        md += d.languages.join(', ') + '\n';
      }

    } else if (documentTemplate === 'id-card') {
      md = `# PERSONAL IDENTIFICATION CARD\n\n`;
      md += `**Name:** ${d.fullName || ''}\n`;
      md += `**ID Number:** ${d.idNumber || ''}\n`;
      md += `**Title:** ${d.role || ''}\n`;
      md += `**Department:** ${d.department || ''}\n`;
      md += `**Email:** ${d.email || ''}\n`;
      md += `**Phone:** ${d.phone || ''}\n`;
      md += `**Issued:** ${d.issueDate || ''}\n`;
      md += `**Expires:** ${d.expiryDate || ''}\n`;
      md += `**Blood Group:** ${d.bloodGroup || ''}\n`;
      md += `**Authorized Signature:** *${d.signature || ''}*\n`;

    } else if (documentTemplate === 'report') {
      md = `# ${d.title || 'Official Report'}\n`;
      md += `### ${d.subtitle || ''}\n`;
      md += `**Author:** ${d.author || ''} | **Date:** ${d.date || ''}\n\n`;
      md += `---\n\n`;
      md += `## Executive Summary\n${d.executiveSummary || ''}\n\n`;

      md += `## Key Indicators\n`;
      if (Array.isArray(d.keyMetrics)) {
        d.keyMetrics.forEach((m: any) => {
          md += `- **${m.label}**: ${m.value} (${m.status || 'stable'})\n`;
        });
      }
      md += `\n---\n\n`;

      if (Array.isArray(d.sections)) {
        d.sections.forEach((s: any) => {
          md += `## ${s.heading}\n${s.content}\n\n`;
        });
      }

      md += `## Conclusions\n${d.conclusions || ''}\n\n`;
      md += `## Recommendations\n`;
      if (Array.isArray(d.recommendations)) {
        md += d.recommendations.map((r: string) => `- ${r}`).join('\n') + '\n';
      }

    } else if (documentTemplate === 'certificate') {
      md = `# ${d.title || 'Certificate of Achievement'}\n\n`;
      md += `**${d.subtitle || 'With honor presented to'}**\n\n`;
      md += `# ${d.recipientName || 'Recipient'}\n\n`;
      md += `${d.achievementDescription || ''}\n\n`;
      md += `**Institution:** ${d.institutionName || 'Exona'}\n`;
      md += `**Issue Date:** ${d.issueDate || ''}\n`;
      md += `**Credential ID:** ${d.credentialId || ''}\n\n`;
      md += `**Authorized Signatory:** ${d.issuerName || ''} (${d.issuerRole || ''})\n`;

    } else if (documentTemplate === 'agreement') {
      md = `# ${d.title || 'Agreement'}\n\n`;
      md += `**Effective Date:** ${d.effectiveDate || ''}\n\n`;
      md += `This agreement is made between **${d.partyA || ''}** and **${d.partyB || ''}**.\n\n`;
      md += `---\n\n`;
      
      if (Array.isArray(d.clauses)) {
        d.clauses.forEach((c: any) => {
          md += `## ${c.title}\n${c.content}\n\n`;
        });
      }

      md += `## Payment Terms\n${d.paymentTerms || ''}\n\n`;
      md += `## Governing Law\nGoverned by the laws of ${d.governingLaw || ''}.\n\n`;
      md += `## Termination\n${d.terminationConditions || ''}\n\n`;
      md += `Signed by:\n**${d.partyA || ''}** / **${d.partyB || ''}**\n`;

    } else if (documentTemplate === 'invoice') {
      md = `# INVOICE\n`;
      md += `**Invoice No:** ${d.invoiceNumber || ''}\n`;
      md += `**Date:** ${d.invoiceDate || ''} | **Due Date:** ${d.dueDate || ''}\n\n`;
      
      md += `### Sender Info\n**${d.senderInfo?.name || ''}**\n${d.senderInfo?.address || ''}\nPhone: ${d.senderInfo?.phone || ''} | Email: ${d.senderInfo?.email || ''}\nTax ID: ${d.senderInfo?.taxId || ''}\n\n`;
      md += `### Bill To\n**${d.recipientInfo?.name || ''}**\n${d.recipientInfo?.address || ''}\nEmail: ${d.recipientInfo?.email || ''}\n\n`;
      
      md += `### Items\n`;
      md += `| Item | Qty | Rate | Total |\n`;
      md += `| :--- | :---: | :---: | :---: |\n`;
      let subtotal = 0;
      if (Array.isArray(d.items)) {
        d.items.forEach((item: any) => {
          const itemTotal = (item.quantity || 0) * (item.rate || 0);
          subtotal += itemTotal;
          md += `| ${item.description || ''} | ${item.quantity || 1} | £${item.rate || 0} | £${itemTotal} |\n`;
        });
      }
      const tax = subtotal * ((d.taxRate || 0) / 100);
      const grandTotal = subtotal + tax;

      md += `\n**Subtotal:** £${subtotal.toFixed(2)}\n`;
      md += `**Tax (${d.taxRate || 0}%):** £${tax.toFixed(2)}\n`;
      md += `**Total Outstanding:** £${grandTotal.toFixed(2)}\n\n`;
      md += `### Notes\n${d.notes || ''}\n\n`;
      md += `### Terms & Account Info\n${d.terms || ''}\n`;

    } else if (documentTemplate === 'receipt') {
      md = `# RECEIPT\n`;
      md += `**Receipt Number:** ${d.receiptNumber || ''}\n`;
      md += `**Date:** ${d.transactionDate || ''}\n\n`;
      md += `### Merchant Info\n**${d.merchantInfo?.name || ''}**\n${d.merchantInfo?.address || ''}\nPhone: ${d.merchantInfo?.phone || ''}\n\n`;
      md += `**Customer:** ${d.customerName || 'Cust'}\n`;
      md += `**Served By:** ${d.cashier || ''}\n\n`;

      md += `### Items\n`;
      if (Array.isArray(d.items)) {
        d.items.forEach((item: any) => {
          md += `- **${item.name}**: £${(item.amount || 0).toFixed(2)}\n`;
        });
      }

      md += `\n**Subtotal:** £${(d.subtotal || 0).toFixed(2)}\n`;
      md += `**Discount Applied:** -£${(d.discount || 0).toFixed(2)}\n`;
      md += `**Sales Tax:** £${(d.tax || 0).toFixed(2)}\n`;
      md += `**GRAND TOTAL PAID:** £${(d.totalAmount || 0).toFixed(2)}\n\n`;
      md += `**Payment Channel:** ${d.paymentMethod || 'Cash'}\n`;
    } else if (documentTemplate === 'coreldraw') {
      md = `# CorelDRAW AI Vector Layout Draft\n\n`;
      md += `**Artboard Dimensions:** ${d.canvasSize?.width || 600}x${d.canvasSize?.height || 400}${d.canvasSize?.unit || 'px'}\n`;
      md += `**Background Style:** ${d.canvasSize?.background || '#ffffff'}\n\n`;
      md += `## Vector Layers (${d.layers?.length || 0})\n\n`;
      if (Array.isArray(d.layers)) {
        d.layers.forEach((layer: any) => {
          md += `### Layer: ${layer.name} [Visible: ${layer.visible ? 'Yes' : 'No'} | Locked: ${layer.locked ? 'Yes' : 'No'}]\n`;
          if (Array.isArray(layer.elements)) {
            layer.elements.forEach((el: any) => {
              md += `- **[${el.type.toUpperCase()}]** ID: \`${el.id}\` | Pos: (${el.x}, ${el.y}) | Dim: ${el.width || 0}x${el.height || 0} | Fill: \`${el.fill || 'none'}\` | Stroke: \`${el.stroke || 'none'}\` (w: ${el.strokeWidth || 0}) ${el.text ? `| Content: "${el.text}"` : ''}\n`;
            });
          }
          md += `\n`;
        });
      }
      if (Array.isArray(d.dimensionLines) && d.dimensionLines.length > 0) {
        md += `## Blueprint Dimensions\n`;
        d.dimensionLines.forEach((dl: any, idx: number) => {
          md += `- Dimension ${idx + 1}: From (${dl.x1}, ${dl.y1}) to (${dl.x2}, ${dl.y2}) - **Label:** "${dl.label}"\n`;
        });
      }
    }

    return md;
  };

  // Submit AI Prompt request Handler
  const handleAiAutoFillSubmit = async () => {
    if (!docAiPrompt.trim()) {
      showNotification('Please enter a description or click a preset first', 'info');
      return;
    }

    setIsDocGenerating(true);
    try {
      const response = await fetch('/api/ai/fill-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateType: documentTemplate,
          userRequest: docAiPrompt
        })
      });

      const resData = await response.json();
      if (resData.success && resData.filledData) {
        setDocData(resData.filledData);
        showNotification(`${documentTemplate.toUpperCase()} auto-filled successfully!`, 'success');
      } else {
        throw new Error(resData.error || 'Server returned invalid schema');
      }
    } catch (err: any) {
      console.error(err);
      showNotification(err.message || 'AI Auto-fill failed. Please try again.', 'error');
    } finally {
      setIsDocGenerating(false);
    }
  };

  // Preset Selection Click Handler
  const handlePresetSelect = (text: string) => {
    setDocAiPrompt(text);
  };

  // Direct interactive updating of fields
  const updateField = (path: string[], value: any) => {
    setDocData((prev: any) => {
      const copy = JSON.parse(JSON.stringify(prev));
      let current = copy;
      for (let i = 0; i < path.length - 1; i++) {
        if (!current[path[i]]) {
          current[path[i]] = {};
        }
        current = current[path[i]];
      }
      current[path[path.length - 1]] = value;
      return copy;
    });
  };

  // Print execution helper
  const handleDirectPrintCmd = () => {
    window.print();
  };

  // Save Document to Firebase integration
  const saveToFirebaseCloudFiles = async () => {
    if (!user) {
      showNotification('You must be logged in to save documents', 'error');
      return;
    }

    const mdContent = convertDataToMarkdown();
    const title = docData.title || docData.fullName || docData.recipientName || docData.invoiceNumber || docData.receiptNumber || `Auto ${documentTemplate}`;
    const cleanTitle = title.replace(/[#*`[\]]/g, '').trim() || 'Smart Document';

    try {
      await addDoc(collection(database, 'cloudFiles'), {
        name: `${cleanTitle}-${documentTemplate}.md`,
        type: 'text/markdown',
        size: new Blob([mdContent]).size,
        url: '#',
        ownerUid: user.uid,
        timestamp: serverTimestamp(),
        category: 'document',
        content: mdContent
      });
      showNotification(`"${cleanTitle}" saved securely in Cloud Files!`, 'success');
    } catch (err: any) {
      console.error(err);
      showNotification('Failed to save to cloud files list: ' + err.message, 'error');
    }
  };

  // Transfer to workspace manual markdown editor
  const transferToWorkspaceEditor = () => {
    const markdownText = convertDataToMarkdown();
    setEditorContent(markdownText);
    setEditorMode('standard');
    showNotification('Document transferred to Markdown Editor!', 'success');
  };

  // Calculate invoice subtotal/total
  const getInvoiceAmounts = () => {
    let subtotal = 0;
    if (Array.isArray(docData.items)) {
      docData.items.forEach((it: any) => {
        subtotal += (it.quantity || 1) * (it.rate || 0);
      });
    }
    const tax = subtotal * ((docData.taxRate || 0) / 100);
    const grandTotal = subtotal + tax;
    return { subtotal, tax, grandTotal };
  };

  const invoiceNumbers = getInvoiceAmounts();

  return (
    <div className="flex flex-col w-full text-zinc-800">
      
      {/* Category selector strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 mb-6 no-print">
        {categories.map((c) => {
          const Icon = c.icon;
          const isSelected = documentTemplate === c.id;
          return (
            <button
              id={`tab-btn-${c.id}`}
              key={c.id}
              onClick={() => onTemplateChange(c.id as any)}
              className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                isSelected 
                  ? 'bg-accent text-white border-accent shadow-lg shadow-accent/20 scale-[1.03]'
                  : 'bg-white border-zinc-100 text-zinc-500 hover:border-zinc-200'
              }`}
            >
              <Icon size={18} className={isSelected ? 'text-white mb-1' : 'text-zinc-500 mb-1'} />
              <span className="text-[10px] font-bold tracking-tight">{c.label}</span>
            </button>
          );
        })}
      </div>

      {/* AI auto generate controls */}
      <div className="bg-gradient-to-br from-indigo-50/50 via-white to-violet-50/50 border border-indigo-100/60 p-6 rounded-3xl mb-8 no-print shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1 px-2.5 bg-indigo-100 text-indigo-700 font-black text-[9px] uppercase tracking-wider rounded-full flex items-center gap-1">
            <Sparkles size={10} /> AI Powered
          </div>
          <h3 className="text-xs font-bold text-zinc-700">Auto-fill this template using natural language</h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Natural Language Prompt Area */}
          <div className="lg:col-span-8 flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <textarea
                id="doc-ai-prompt-input"
                value={docAiPrompt}
                onChange={(e) => setDocAiPrompt(e.target.value)}
                className="flex-1 min-h-[90px] p-4 text-xs bg-white border border-indigo-100/80 rounded-2xl focus:border-indigo-300 outline-none resize-none text-zinc-800 leading-relaxed font-sans placeholder-zinc-400"
                placeholder={`Describe what you want to fill in the ${documentTemplate.toUpperCase()} template. Type a prompt, drop a reference design image, or click one of the quick presets below...`}
              />
              <button
                id="btn-trigger-doc-fill"
                onClick={handleAiAutoFillSubmit}
                disabled={isDocGenerating}
                className="h-auto sm:w-44 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-2xl text-[10px] uppercase tracking-widest font-black transition-all flex flex-col items-center justify-center gap-2 cursor-pointer p-4 select-none hover:scale-[1.02]"
              >
                {isDocGenerating ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span>Structuring...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={18} className="animate-pulse" />
                    <span>AI Magic Fill</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Scanned Image Layout Dropzone */}
          <div className="lg:col-span-4 select-none">
            <div 
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleDesignImageScan(e.dataTransfer.files[0]);
                }
              }}
              className={`relative h-full min-h-[95px] border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                dragOver 
                  ? 'border-indigo-500 bg-indigo-50/60 scale-[1.02]' 
                  : isScanning 
                    ? 'border-pink-400 bg-pink-50/20' 
                    : 'border-indigo-100 bg-white hover:border-indigo-300 hover:bg-indigo-50/20'
              }`}
            >
              <input
                type="file"
                id="design-scanner-upload"
                className="hidden"
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleDesignImageScan(e.target.files[0]);
                  }
                }}
              />
              <label htmlFor="design-scanner-upload" className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
                {isScanning ? (
                  <div className="space-y-1.5 py-1">
                    <Camera size={22} className="text-pink-500 animate-bounce mx-auto" />
                    <div className="text-[10px] font-bold text-pink-600 tracking-tight uppercase">Scanning Document Layout</div>
                    <p className="text-[9px] text-zinc-400 animate-pulse">Reverse-engineering visual designs via Gemini...</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Upload size={20} className="text-indigo-400 mx-auto transition-transform" />
                    <div className="text-[10px] font-bold text-zinc-700">Scan Template Image</div>
                    <p className="text-[9px] text-zinc-400 leading-normal max-w-[200px] mx-auto">
                      Drop any ID Card, Certificate, Resume, or sketch to auto-generate & fill fields!
                    </p>
                  </div>
                )}
              </label>
            </div>
          </div>
        </div>

        {/* Quick presets list */}
        <div className="mt-4">
          <span className="text-[9px] uppercase tracking-widest font-black text-indigo-400/80 block mb-1.5">Try Quick Presets:</span>
          <div className="flex flex-wrap gap-2">
            {presets[documentTemplate]?.map((pr, idx) => (
              <button
                key={idx}
                onClick={() => handlePresetSelect(pr)}
                className="text-[10px] text-zinc-600 hover:text-indigo-700 font-medium bg-zinc-50 border border-zinc-100 hover:border-indigo-100 rounded-full px-3 py-1 cursor-pointer transition-colors max-w-full truncate"
                title={pr}
              >
                Preset {idx + 1}: "{pr.substring(0, 50)}..."
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main layout: Inputs on Left, Premium styled Previews on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: Input form editors */}
        <div id="document-form-editor" className="lg:col-span-5 space-y-4 bg-white border border-zinc-100 rounded-3xl p-6 shadow-sm no-print">
          <div className="border-b border-zinc-100 pb-3">
            <h4 className="text-xs uppercase tracking-wider font-black text-zinc-400">Template Fields</h4>
            <span className="text-[10px] text-zinc-500">Fine-tune the data manually inside the fields below.</span>
          </div>

          <div className="space-y-3 text-xs max-h-[600px] overflow-y-auto pr-1">
            
            {/* Template specific fields */}
            {documentTemplate === 'cv' && (
              <>
                <div>
                  <label className="text-[9px] uppercase font-bold text-zinc-500 block mb-1">Full Name</label>
                  <input type="text" value={docData.fullName || ''} onChange={(e) => updateField(['fullName'], e.target.value)} className="w-full p-2.5 border border-zinc-100 rounded-lg outline-none focus:border-indigo-300" />
                </div>
                <div>
                  <label className="text-[9px] uppercase font-bold text-zinc-500 block mb-1">Job Title</label>
                  <input type="text" value={docData.jobTitle || ''} onChange={(e) => updateField(['jobTitle'], e.target.value)} className="w-full p-2.5 border border-zinc-100 rounded-lg outline-none focus:border-indigo-300" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] uppercase font-bold text-zinc-500 block mb-1">Email</label>
                    <input type="email" value={docData.email || ''} onChange={(e) => updateField(['email'], e.target.value)} className="w-full p-2.5 border border-zinc-100 rounded-lg outline-none focus:border-indigo-300" />
                  </div>
                  <div>
                    <label className="text-[9px] uppercase font-bold text-zinc-500 block mb-1">Phone</label>
                    <input type="text" value={docData.phone || ''} onChange={(e) => updateField(['phone'], e.target.value)} className="w-full p-2.5 border border-zinc-100 rounded-lg outline-none focus:border-indigo-300" />
                  </div>
                </div>
                <div>
                  <label className="text-[9px] uppercase font-bold text-zinc-500 block mb-1">Address / Location</label>
                  <input type="text" value={docData.address || ''} onChange={(e) => updateField(['address'], e.target.value)} className="w-full p-2.5 border border-zinc-100 rounded-lg outline-none focus:border-indigo-300" />
                </div>
                <div>
                  <label className="text-[9px] uppercase font-bold text-zinc-500 block mb-1">Summary Profile</label>
                  <textarea value={docData.summary || ''} onChange={(e) => updateField(['summary'], e.target.value)} className="w-full min-h-[100px] p-2.5 border border-zinc-100 rounded-lg outline-none focus:border-indigo-300 resize-none" />
                </div>
              </>
            )}

            {documentTemplate === 'id-card' && (
              <>
                <div>
                  <label className="text-[9px] uppercase font-bold text-zinc-500 block mb-1">Cardholder Full Name</label>
                  <input type="text" value={docData.fullName || ''} onChange={(e) => updateField(['fullName'], e.target.value)} className="w-full p-2.5 border border-zinc-100 rounded-lg outline-none focus:border-indigo-300" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] uppercase font-bold text-zinc-500 block mb-1">ID Number</label>
                    <input type="text" value={docData.idNumber || ''} onChange={(e) => updateField(['idNumber'], e.target.value)} className="w-full p-2.5 border border-zinc-100 rounded-lg outline-none focus:border-indigo-300" />
                  </div>
                  <div>
                    <label className="text-[9px] uppercase font-bold text-zinc-500 block mb-1">Role / Rank</label>
                    <input type="text" value={docData.role || ''} onChange={(e) => updateField(['role'], e.target.value)} className="w-full p-2.5 border border-zinc-100 rounded-lg outline-none focus:border-indigo-300" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] uppercase font-bold text-zinc-500 block mb-1">Department</label>
                    <input type="text" value={docData.department || ''} onChange={(e) => updateField(['department'], e.target.value)} className="w-full p-2.5 border border-zinc-100 rounded-lg outline-none focus:border-indigo-300" />
                  </div>
                  <div>
                    <label className="text-[9px] uppercase font-bold text-zinc-500 block mb-1">Blood Group</label>
                    <input type="text" value={docData.bloodGroup || ''} onChange={(e) => updateField(['bloodGroup'], e.target.value)} className="w-full p-2.5 border border-zinc-100 rounded-lg outline-none focus:border-indigo-300" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] uppercase font-bold text-zinc-500 block mb-1">Issue Date</label>
                    <input type="text" value={docData.issueDate || ''} onChange={(e) => updateField(['issueDate'], e.target.value)} className="w-full p-2.5 border border-zinc-100 rounded-lg outline-none focus:border-indigo-300" />
                  </div>
                  <div>
                    <label className="text-[9px] uppercase font-bold text-zinc-500 block mb-1">Expiry Date</label>
                    <input type="text" value={docData.expiryDate || ''} onChange={(e) => updateField(['expiryDate'], e.target.value)} className="w-full p-2.5 border border-zinc-100 rounded-lg outline-none focus:border-indigo-300" />
                  </div>
                </div>
                <div>
                  <label className="text-[9px] uppercase font-bold text-zinc-500 block mb-1">Signature Line text</label>
                  <input type="text" value={docData.signature || ''} onChange={(e) => updateField(['signature'], e.target.value)} className="w-full p-2.5 border border-zinc-100 rounded-lg outline-none focus:border-indigo-300 font-mono" />
                </div>
              </>
            )}

            {documentTemplate === 'report' && (
              <>
                <div>
                  <label className="text-[9px] uppercase font-bold text-zinc-500 block mb-1">Report Title</label>
                  <input type="text" value={docData.title || ''} onChange={(e) => updateField(['title'], e.target.value)} className="w-full p-2.5 border border-zinc-100 rounded-lg outline-none focus:border-indigo-300 font-bold" />
                </div>
                <div>
                  <label className="text-[9px] uppercase font-bold text-zinc-500 block mb-1">Subtitle</label>
                  <input type="text" value={docData.subtitle || ''} onChange={(e) => updateField(['subtitle'], e.target.value)} className="w-full p-2.5 border border-zinc-100 rounded-lg outline-none focus:border-indigo-300" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] uppercase font-bold text-zinc-500 block mb-1">Author Name </label>
                    <input type="text" value={docData.author || ''} onChange={(e) => updateField(['author'], e.target.value)} className="w-full p-2.5 border border-zinc-100 rounded-lg outline-none focus:border-indigo-300" />
                  </div>
                  <div>
                    <label className="text-[9px] uppercase font-bold text-zinc-500 block mb-1">Date</label>
                    <input type="text" value={docData.date || ''} onChange={(e) => updateField(['date'], e.target.value)} className="w-full p-2.5 border border-zinc-100 rounded-lg outline-none focus:border-indigo-300" />
                  </div>
                </div>
                <div>
                  <label className="text-[9px] uppercase font-bold text-zinc-500 block mb-1">Executive Summary Overview</label>
                  <textarea value={docData.executiveSummary || ''} onChange={(e) => updateField(['executiveSummary'], e.target.value)} className="w-full min-h-[90px] p-2.5 border border-zinc-100 rounded-lg outline-none focus:border-indigo-300 resize-none" />
                </div>
                <div>
                  <label className="text-[9px] uppercase font-bold text-zinc-500 block mb-1">Conclusions</label>
                  <textarea value={docData.conclusions || ''} onChange={(e) => updateField(['conclusions'], e.target.value)} className="w-full min-h-[70px] p-2.5 border border-zinc-100 rounded-lg outline-none focus:border-indigo-300 resize-none" />
                </div>
              </>
            )}

            {documentTemplate === 'certificate' && (
              <>
                <div>
                  <label className="text-[9px] uppercase font-bold text-zinc-500 block mb-1">Certificate Header Title</label>
                  <input type="text" value={docData.title || ''} onChange={(e) => updateField(['title'], e.target.value)} className="w-full p-2.5 border border-zinc-100 rounded-lg outline-none focus:border-indigo-300" />
                </div>
                <div>
                  <label className="text-[9px] uppercase font-bold text-zinc-500 block mb-1">Subtitle presented to statement</label>
                  <input type="text" value={docData.subtitle || ''} onChange={(e) => updateField(['subtitle'], e.target.value)} className="w-full p-2.5 border border-zinc-100 rounded-lg outline-none focus:border-indigo-300" />
                </div>
                <div>
                  <label className="text-[9px] uppercase font-bold text-zinc-500 block mb-1">Recipient Full Name</label>
                  <input type="text" value={docData.recipientName || ''} onChange={(e) => updateField(['recipientName'], e.target.value)} className="w-full p-2.5 border border-zinc-100 rounded-lg text-sm font-bold text-indigo-700 outline-none focus:border-indigo-300" />
                </div>
                <div>
                  <label className="text-[9px] uppercase font-bold text-zinc-500 block mb-1">Achievement Description details</label>
                  <textarea value={docData.achievementDescription || ''} onChange={(e) => updateField(['achievementDescription'], e.target.value)} className="w-full min-h-[100px] p-2.5 border border-zinc-100 rounded-lg outline-none focus:border-indigo-300 resize-none" />
                </div>
                <div>
                  <label className="text-[9px] uppercase font-bold text-zinc-500 block mb-1">Certifying Institution Name</label>
                  <input type="text" value={docData.institutionName || ''} onChange={(e) => updateField(['institutionName'], e.target.value)} className="w-full p-2.5 border border-zinc-100 rounded-lg outline-none focus:border-indigo-300" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] uppercase font-bold text-zinc-500 block mb-1">Issue Date</label>
                    <input type="text" value={docData.issueDate || ''} onChange={(e) => updateField(['issueDate'], e.target.value)} className="w-full p-2.5 border border-zinc-100 rounded-lg outline-none focus:border-indigo-300" />
                  </div>
                  <div>
                    <label className="text-[9px] uppercase font-bold text-zinc-500 block mb-1">Credential ID</label>
                    <input type="text" value={docData.credentialId || ''} onChange={(e) => updateField(['credentialId'], e.target.value)} className="w-full p-2.5 border border-zinc-100 rounded-lg outline-none focus:border-indigo-300" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] uppercase font-bold text-zinc-500 block mb-1">Authorized Issuer Name</label>
                    <input type="text" value={docData.issuerName || ''} onChange={(e) => updateField(['issuerName'], e.target.value)} className="w-full p-2.5 border border-zinc-100 rounded-lg outline-none focus:border-indigo-300" />
                  </div>
                  <div>
                    <label className="text-[9px] uppercase font-bold text-zinc-500 block mb-1">Issuer/Certifier Role Title</label>
                    <input type="text" value={docData.issuerRole || ''} onChange={(e) => updateField(['issuerRole'], e.target.value)} className="w-full p-2.5 border border-zinc-100 rounded-lg outline-none focus:border-indigo-300" />
                  </div>
                </div>
              </>
            )}

            {documentTemplate === 'agreement' && (
              <>
                <div>
                  <label className="text-[9px] uppercase font-bold text-zinc-500 block mb-1">Agreement / Contract Title</label>
                  <input type="text" value={docData.title || ''} onChange={(e) => updateField(['title'], e.target.value)} className="w-full p-2.5 border border-zinc-100 rounded-lg outline-none focus:border-indigo-300 font-bold" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] uppercase font-bold text-zinc-500 block mb-1">Party A Name</label>
                    <input type="text" value={docData.partyA || ''} onChange={(e) => updateField(['partyA'], e.target.value)} className="w-full p-2.5 border border-zinc-100 rounded-lg outline-none focus:border-indigo-300" />
                  </div>
                  <div>
                    <label className="text-[9px] uppercase font-bold text-zinc-500 block mb-1">Party B Name</label>
                    <input type="text" value={docData.partyB || ''} onChange={(e) => updateField(['partyB'], e.target.value)} className="w-full p-2.5 border border-zinc-100 rounded-lg outline-none focus:border-indigo-300" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] uppercase font-bold text-zinc-500 block mb-1">Effective Date</label>
                    <input type="text" value={docData.effectiveDate || ''} onChange={(e) => updateField(['effectiveDate'], e.target.value)} className="w-full p-2.5 border border-zinc-100 rounded-lg outline-none focus:border-indigo-300" />
                  </div>
                  <div>
                    <label className="text-[9px] uppercase font-bold text-zinc-500 block mb-1">Governing Law Jurisdiction</label>
                    <input type="text" value={docData.governingLaw || ''} onChange={(e) => updateField(['governingLaw'], e.target.value)} className="w-full p-2.5 border border-zinc-100 rounded-lg outline-none focus:border-indigo-300" />
                  </div>
                </div>
                <div>
                  <label className="text-[9px] uppercase font-bold text-zinc-500 block mb-1">Payment & Compensation terms</label>
                  <textarea value={docData.paymentTerms || ''} onChange={(e) => updateField(['paymentTerms'], e.target.value)} className="w-full min-h-[70px] p-2.5 border border-zinc-100 rounded-lg outline-none focus:border-indigo-300 resize-none animate-pulse-once" />
                </div>
                <div>
                  <label className="text-[9px] uppercase font-bold text-zinc-500 block mb-1">Termination Conditions</label>
                  <textarea value={docData.terminationConditions || ''} onChange={(e) => updateField(['terminationConditions'], e.target.value)} className="w-full min-h-[70px] p-2.5 border border-zinc-100 rounded-lg outline-none focus:border-indigo-300 resize-none" />
                </div>
              </>
            )}

            {documentTemplate === 'invoice' && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] uppercase font-bold text-zinc-500 block mb-1">Invoice Number</label>
                    <input type="text" value={docData.invoiceNumber || ''} onChange={(e) => updateField(['invoiceNumber'], e.target.value)} className="w-full p-2.5 border border-zinc-100 rounded-lg outline-none focus:border-indigo-300" />
                  </div>
                  <div>
                    <label className="text-[9px] uppercase font-bold text-zinc-500 block mb-1">Tax Rate %</label>
                    <input type="number" value={docData.taxRate || 0} onChange={(e) => updateField(['taxRate'], parseFloat(e.target.value) || 0)} className="w-full p-2.5 border border-zinc-100 rounded-lg outline-none focus:border-indigo-300" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] uppercase font-bold text-zinc-500 block mb-1">Invoice Date</label>
                    <input type="text" value={docData.invoiceDate || ''} onChange={(e) => updateField(['invoiceDate'], e.target.value)} className="w-full p-2.5 border border-zinc-100 rounded-lg outline-none focus:border-indigo-300" />
                  </div>
                  <div>
                    <label className="text-[9px] uppercase font-bold text-zinc-500 block mb-1">Due Date</label>
                    <input type="text" value={docData.dueDate || ''} onChange={(e) => updateField(['dueDate'], e.target.value)} className="w-full p-2.5 border border-zinc-100 rounded-lg outline-none focus:border-indigo-300" />
                  </div>
                </div>
                <div>
                  <label className="text-[9px] uppercase font-bold text-zinc-500 block mb-1">Sender Organisation Name</label>
                  <input type="text" value={docData.senderInfo?.name || ''} onChange={(e) => updateField(['senderInfo', 'name'], e.target.value)} className="w-full p-2.5 border border-zinc-100 rounded-lg outline-none focus:border-indigo-300" />
                </div>
                <div>
                  <label className="text-[9px] uppercase font-bold text-zinc-500 block mb-1">Recipient Organisation Name</label>
                  <input type="text" value={docData.recipientInfo?.name || ''} onChange={(e) => updateField(['recipientInfo', 'name'], e.target.value)} className="w-full p-2.5 border border-zinc-100 rounded-lg outline-none focus:border-indigo-300" />
                </div>
                <div>
                  <label className="text-[9px] uppercase font-bold text-zinc-500 block mb-1">Bank Payment Wire details</label>
                  <input type="text" value={docData.terms || ''} onChange={(e) => updateField(['terms'], e.target.value)} className="w-full p-2.5 border border-zinc-100 rounded-lg outline-none focus:border-indigo-300" />
                </div>
                <div>
                  <label className="text-[9px] uppercase font-bold text-zinc-500 block mb-1">Memo / Thanks Message</label>
                  <input type="text" value={docData.notes || ''} onChange={(e) => updateField(['notes'], e.target.value)} className="w-full p-2.5 border border-zinc-100 rounded-lg outline-none focus:border-indigo-300" />
                </div>
              </>
            )}

            {documentTemplate === 'receipt' && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] uppercase font-bold text-zinc-500 block mb-1">Receipt Number</label>
                    <input type="text" value={docData.receiptNumber || ''} onChange={(e) => updateField(['receiptNumber'], e.target.value)} className="w-full p-2.5 border border-zinc-100 rounded-lg outline-none focus:border-indigo-300 font-mono" />
                  </div>
                  <div>
                    <label className="text-[9px] uppercase font-bold text-zinc-500 block mb-1">Sales Cashier</label>
                    <input type="text" value={docData.cashier || ''} onChange={(e) => updateField(['cashier'], e.target.value)} className="w-full p-2.5 border border-zinc-100 rounded-lg outline-none focus:border-indigo-300" />
                  </div>
                </div>
                <div>
                  <label className="text-[9px] uppercase font-bold text-zinc-500 block mb-1">Transaction Date & Time</label>
                  <input type="text" value={docData.transactionDate || ''} onChange={(e) => updateField(['transactionDate'], e.target.value)} className="w-full p-2.5 border border-zinc-100 rounded-lg outline-none focus:border-indigo-300" />
                </div>
                <div>
                  <label className="text-[9px] uppercase font-bold text-zinc-500 block mb-1">Merchant Store Name</label>
                  <input type="text" value={docData.merchantInfo?.name || ''} onChange={(e) => updateField(['merchantInfo', 'name'], e.target.value)} className="w-full p-2.5 border border-zinc-100 rounded-lg outline-none focus:border-indigo-300 font-semibold" />
                </div>
                <div>
                  <label className="text-[9px] uppercase font-bold text-zinc-500 block mb-1">Customer Name</label>
                  <input type="text" value={docData.customerName || ''} onChange={(e) => updateField(['customerName'], e.target.value)} className="w-full p-2.5 border border-zinc-100 rounded-lg outline-none focus:border-indigo-300 animate-pulse-once" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] uppercase font-bold text-zinc-500 block mb-1">Receipt Total Paid (£)</label>
                    <input type="number" value={docData.totalAmount || 0} onChange={(e) => updateField(['totalAmount'], parseFloat(e.target.value) || 0)} className="w-full p-2.5 border border-zinc-100 rounded-lg outline-none focus:border-indigo-300" />
                  </div>
                  <div>
                    <label className="text-[9px] uppercase font-bold text-zinc-500 block mb-1">Payment Method</label>
                    <input type="text" value={docData.paymentMethod || ''} onChange={(e) => updateField(['paymentMethod'], e.target.value)} className="w-full p-2.5 border border-zinc-100 rounded-lg outline-none focus:border-indigo-300" />
                  </div>
                </div>
              </>
            )}

            {documentTemplate === 'coreldraw' && (
              <div className="space-y-4">
                {/* Visual Tool Inspector */}
                <div className="bg-zinc-950 text-white rounded-2xl p-4 font-mono text-xs border-l-4 border-pink-500">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase font-bold text-pink-500">Active Workspace Matrix</span>
                    <span className="text-[9px] bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded animate-pulse">CorelDRAW AI</span>
                  </div>
                  <div className="space-y-1 text-zinc-400">
                    <div className="flex justify-between">
                      <span>Canvas Grid Status:</span>
                      <span className="text-emerald-400 font-bold">● Snapped & Aligned</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Interactive Guides:</span>
                      <span className="text-pink-400">Active (Centered)</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Contour Processing:</span>
                      <span className="text-amber-400 font-bold">AI Vector Engine</span>
                    </div>
                  </div>
                </div>

                {/* Vector Layers & Elements Hierarchy */}
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-black text-zinc-400 tracking-wider">Design Layers & Tree</span>
                  <div className="space-y-2 max-h-[350px] overflow-y-auto">
                    {Array.isArray(docData.layers) && docData.layers.map((layer: any, listIdx: number) => (
                      <div key={layer.id || listIdx} className="border border-zinc-100 rounded-xl p-3 bg-zinc-50/50">
                        {/* Layer Header */}
                        <div className="flex items-center justify-between border-b border-zinc-100 pb-2 mb-2">
                          <div className="flex items-center gap-2">
                            <Layers2 size={12} className="text-pink-500 animate-pulse" />
                            <span className="font-bold text-zinc-700">{layer.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {/* Visibility Toggle */}
                            <button 
                              onClick={() => {
                                const newLayers = [...docData.layers];
                                newLayers[listIdx].visible = newLayers[listIdx].visible === false ? true : false;
                                setDocData({ ...docData, layers: newLayers });
                              }}
                              className="p-1 hover:bg-zinc-200/60 rounded text-zinc-500 transition-colors cursor-pointer"
                              title="Toggle Visibility"
                            >
                              {layer.visible !== false ? <Eye size={12} className="text-indigo-600" /> : <EyeOff size={12} />}
                            </button>
                            {/* Lock Toggle */}
                            <button 
                              onClick={() => {
                                const newLayers = [...docData.layers];
                                newLayers[listIdx].locked = newLayers[listIdx].locked === true ? false : true;
                                setDocData({ ...docData, layers: newLayers });
                              }}
                              className="p-1 hover:bg-zinc-200/60 rounded text-zinc-500 transition-colors cursor-pointer"
                              title="Toggle Lock"
                            >
                              {layer.locked === true ? <Lock size={12} className="text-amber-600" /> : <Unlock size={12} />}
                            </button>
                          </div>
                        </div>

                        {/* Elements List inside this Layer */}
                        <div className="space-y-1 pl-3 border-l-2 border-zinc-200/60">
                          {Array.isArray(layer.elements) && layer.elements.map((el: any) => {
                            let ElIcon = Square;
                            if (el.type === 'ellipse') ElIcon = Circle;
                            else if (el.type === 'text') ElIcon = Type;
                            else ElIcon = Palette;

                            return (
                              <div key={el.id} className="flex justify-between items-center text-[10px] hover:bg-zinc-100/80 p-1.5 rounded-lg transition-colors">
                                <span className="flex items-center gap-1.5 text-zinc-600 font-medium">
                                  <ElIcon size={10} className="text-zinc-400" />
                                  {el.id} <span className="text-zinc-400 font-mono text-[9px]">({el.type})</span>
                                </span>
                                <span className="text-zinc-400 font-mono scale-[0.85]">{el.width ? `${el.width}x${el.height}` : `r:${el.r || 30}`}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Interactive AI Designer Action Toolkit */}
                <div className="space-y-2 pt-2 border-t border-zinc-100">
                  <span className="text-[10px] uppercase font-black text-zinc-400 tracking-wider">AI Designer Companion Presets</span>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <button 
                      onClick={() => {
                        setDocAiPrompt("Add concentric glowing orange styling contours around the main star element and center the titles.");
                        showNotification("Preloaded instructions! Click 'AI Magic Fill' to run on the vector engine.", "info");
                      }}
                      className="p-2 border border-pink-100 text-pink-700 hover:bg-pink-100 hover:text-pink-800 transition-colors rounded-xl text-left cursor-pointer font-medium"
                    >
                      🌟 Golden Contour Glow
                    </button>
                    <button 
                      onClick={() => {
                        setDocAiPrompt("Redraw into a high-technology card with an emerald dark premium theme, aligned green shapes, and snap dimension markers on both sides.");
                        showNotification("Preloaded instructions! Click 'AI Magic Fill' to run on the vector engine.", "info");
                      }}
                      className="p-2 border border-emerald-100 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 transition-colors rounded-xl text-left cursor-pointer font-medium"
                    >
                      💎 Emerald Cyber Redesign
                    </button>
                    <button 
                      onClick={() => {
                        setDocAiPrompt("Align the company name and tagline perfectly to the vertical grid, set their text color to clean white, and draw a horizontal gridline path.");
                        showNotification("Preloaded instructions! Click 'AI Magic Fill' to run on the vector engine.", "info");
                      }}
                      className="p-2 border border-indigo-100 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800 transition-colors rounded-xl text-left cursor-pointer font-medium"
                    >
                      🎯 Perfect Grid Snap Align
                    </button>
                    <button 
                      onClick={() => {
                        setDocAiPrompt("Render dimension lines at the bottom measuring total width of 560px, color-coded in light blue, and insert secondary layout annotations.");
                        showNotification("Preloaded instructions! Click 'AI Magic Fill' to run on the vector engine.", "info");
                      }}
                      className="p-2 border border-amber-100 text-amber-700 hover:bg-amber-100 hover:text-amber-800 transition-colors rounded-xl text-left cursor-pointer font-medium"
                    >
                      📐 Draw Dimension Specs
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>

          <div className="pt-4 border-t border-zinc-100 space-y-2">
            <button
              id="btn-transfer-to-editor"
              onClick={transferToWorkspaceEditor}
              className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-950 text-white rounded-xl text-[10px] uppercase tracking-widest font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-zinc-800/10"
            >
              <ArrowRightLeft size={13} />
              Transfer to Markdown Editor
            </button>
            
            <div className="grid grid-cols-2 gap-2">
              <button
                id="btn-cloud-save-file"
                onClick={saveToFirebaseCloudFiles}
                className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] uppercase tracking-widest font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-emerald-500/10"
              >
                <CloudDownload size={13} />
                Cloud Save
              </button>
              <button
                id="btn-print-doc"
                onClick={handleDirectPrintCmd}
                className="py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[10px] uppercase tracking-widest font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <Printer size={13} />
                Print PDF
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Real physical luxury rendering of templates */}
        <div id="document-preview-pane" className="lg:col-span-7 flex flex-col gap-4">
          <div className="bg-white border border-zinc-100 rounded-2xl p-4 flex items-center justify-between shadow-sm no-print">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Live Custom Template Preview</span>
            </div>
            <span className="text-[9px] font-medium bg-zinc-100 border border-zinc-200/50 text-zinc-500 rounded-full px-2.5 py-0.5">Scale: Fit Width</span>
          </div>

          {/* Interactive renders */}
          <div className="bg-zinc-100/50 p-4 sm:p-8 rounded-[2.5rem] border border-zinc-200/40 min-h-[700px] flex items-center justify-center overflow-x-auto shadow-inner">
            
            {/* 1. CV Layout */}
            {documentTemplate === 'cv' && (
              <div id="print-cv-container" className="w-full max-w-[620px] bg-white border border-zinc-200/50 p-10 shadow-xl rounded-2xl text-zinc-800 font-sans leading-relaxed text-xs">
                {/* Header Profile Banner */}
                <div className="border-b-2 border-indigo-600 pb-6 mb-6">
                  <h2 className="text-2xl font-black text-zinc-900 tracking-tight leading-none mb-1">{docData.fullName || 'Full Name'}</h2>
                  <span className="text-sm font-bold text-indigo-600 block mb-3 uppercase tracking-wider">{docData.jobTitle || 'Profession'}</span>
                  
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-zinc-500 font-medium">
                    {docData.email && <span className="flex items-center gap-1"><Mail size={11} className="text-zinc-400" /> {docData.email}</span>}
                    {docData.phone && <span className="flex items-center gap-1"><Phone size={11} className="text-zinc-400" /> {docData.phone}</span>}
                    {docData.website && <span className="flex items-center gap-1"><Globe size={11} className="text-zinc-400" /> {docData.website}</span>}
                    {docData.address && <span className="flex items-center gap-1"><MapPin size={11} className="text-zinc-400" /> {docData.address}</span>}
                  </div>
                </div>

                {/* Profile Summary */}
                {docData.summary && (
                  <div className="mb-6">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-700 mb-2 border-b border-zinc-100 pb-1">Profile Summary</h3>
                    <p className="text-zinc-600 text-xs text-justify leading-relaxed">{docData.summary}</p>
                  </div>
                )}

                {/* Experience Timeline */}
                {Array.isArray(docData.experience) && docData.experience.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-700 mb-3 border-b border-zinc-100 pb-1">Professional Experience</h3>
                    <div className="space-y-4">
                      {docData.experience.map((e: any, idx: number) => (
                        <div key={idx} className="relative pl-4 border-l border-indigo-100">
                          <span className="absolute -left-1.5 top-1 w-3 h-3 bg-indigo-600 border border-white rounded-full"></span>
                          <div className="flex justify-between items-start mb-0.5">
                            <h4 className="font-bold text-zinc-900">{e.role || 'Role'}</h4>
                            <span className="text-[9px] font-black uppercase tracking-widest bg-zinc-100 rounded-full px-2.5 py-0.5 text-zinc-500 shrink-0">{e.period || 'Year'}</span>
                          </div>
                          <span className="text-[10px] font-bold text-indigo-600 block mb-1">{e.company || 'Company'}</span>
                          <p className="text-zinc-600 leading-relaxed text-justify">{e.description || ''}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Education Section */}
                {Array.isArray(docData.education) && docData.education.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-700 mb-3 border-b border-zinc-100 pb-1">Education</h3>
                    <div className="space-y-3">
                      {docData.education.map((edu: any, idx: number) => (
                        <div key={idx} className="relative pl-4 border-l border-zinc-100">
                          <span className="absolute -left-1 top-1 w-2 h-2 bg-indigo-200 border border-white rounded-full"></span>
                          <div className="flex justify-between items-start">
                            <h4 className="font-bold text-zinc-900 text-xs">{edu.degree || 'Degree'}</h4>
                            <span className="text-[9.5px] font-semibold text-zinc-400 shrink-0">{edu.period}</span>
                          </div>
                          <span className="text-[10px] font-medium text-zinc-500 block mb-0.5">{edu.institution}</span>
                          {edu.description && <p className="text-zinc-400 text-[10px] text-justify">{edu.description}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Dual section skills / languages */}
                <div className="grid grid-cols-2 gap-6">
                  {Array.isArray(docData.skills) && docData.skills.length > 0 && (
                    <div>
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-700 mb-2 border-b border-zinc-100 pb-1">Core Competencies</h3>
                      <div className="flex flex-wrap gap-1.5">
                        {docData.skills.map((s: string, idx: number) => (
                          <span key={idx} className="text-[9px] font-black tracking-wide bg-indigo-50/50 border border-indigo-100/50 text-indigo-600 rounded-full px-2.5 py-0.5 scale-95">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {Array.isArray(docData.languages) && docData.languages.length > 0 && (
                    <div>
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-700 mb-2 border-b border-zinc-100 pb-1">Languages</h3>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {docData.languages.map((l: string, idx: number) => (
                          <span key={idx} className="text-[9.5px] font-bold bg-zinc-50 border border-zinc-100 text-zinc-600 rounded px-2 py-0.5">{l}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* 2. ID Card Layout */}
            {documentTemplate === 'id-card' && (
              <div id="print-id-card-container" className="w-[330px] h-[480px] bg-gradient-to-b from-indigo-900 via-indigo-950 to-zinc-950 text-white rounded-3xl p-5 shadow-2xl relative border-4 border-zinc-800 flex flex-col justify-between overflow-hidden">
                {/* Backdrop patterns */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl"></div>

                {/* Card Header */}
                <div className="text-center z-10 border-b border-white/10 pb-3 flex items-center justify-center gap-1.5">
                  <div className="w-5 h-5 rounded-lg bg-emerald-500 flex items-center justify-center text-zinc-950 font-black text-xs shadow-md">E</div>
                  <div>
                    <h3 className="text-xs font-black tracking-widest leading-none mb-0.5">EXONA INDUSTRIES</h3>
                    <span className="text-[7.5px] uppercase tracking-widest font-black text-emerald-400">Verifiable Member</span>
                  </div>
                </div>

                {/* Personal avatar slot & main details */}
                <div className="my-[15px] flex flex-col items-center z-10">
                  {/* Photo Frame */}
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-emerald-400 to-indigo-500 p-0.5 shadow-xl relative mb-3">
                    <div className="w-full h-full bg-zinc-900 rounded-2xl overflow-hidden flex items-center justify-center relative">
                      <User className="text-indigo-200/50" size={36} />
                      {/* Scan Status */}
                      <span className="absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-zinc-900 animate-ping"></span>
                    </div>
                  </div>

                  {/* Name and Designation */}
                  <h4 className="text-sm font-black tracking-wide leading-tight text-center text-white truncate max-w-full">{docData.fullName || 'Name Placeholder'}</h4>
                  <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider mb-2">{docData.role || 'Designation'}</span>
                  
                  {/* Badge Category Tag */}
                  <span className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 text-[8px] tracking-widest font-black rounded-full uppercase leading-none border border-emerald-400/30">
                    {docData.department || 'GENERAL'}
                  </span>
                </div>

                {/* Meta Grid Section */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-3 grid grid-cols-2 gap-y-2 gap-x-3 text-[9px] z-10 font-sans">
                  <div>
                    <span className="text-white/40 block text-[7px] uppercase font-bold">Member ID</span>
                    <span className="font-mono text-white tracking-widest font-medium">{docData.idNumber || 'EX-0000'}</span>
                  </div>
                  <div>
                    <span className="text-white/40 block text-[7px] uppercase font-bold">Blood Type</span>
                    <span className="font-bold text-emerald-400 font-sans">{docData.bloodGroup || 'A+'}</span>
                  </div>
                  <div>
                    <span className="text-white/40 block text-[7px] uppercase font-bold">Issued on</span>
                    <span className="text-white font-medium">{docData.issueDate || '2026-05-24'}</span>
                  </div>
                  <div>
                    <span className="text-white/40 block text-[7px] uppercase font-bold">Expires on</span>
                    <span className="text-white font-medium">{docData.expiryDate || '2029-05-24'}</span>
                  </div>
                </div>

                {/* Footer Barcode Simulation & Sign */}
                <div className="border-t border-white/10 pt-3 flex items-center justify-between z-10 text-[8px]">
                  {/* barcode lines */}
                  <div className="flex flex-col gap-0.5 justify-center">
                    <div className="flex gap-x-[1.5px] bg-white p-1 rounded-sm">
                      <span className="bg-black w-[1px] h-4"></span>
                      <span className="bg-black w-[2px] h-4"></span>
                      <span className="bg-black w-[1px] h-4"></span>
                      <span className="bg-black w-[3px] h-4"></span>
                      <span className="bg-black w-[1px] h-4"></span>
                      <span className="bg-black w-[2px] h-4"></span>
                      <span className="bg-black w-[1px] h-4"></span>
                    </div>
                    <span className="font-mono text-[7px] text-zinc-500 leading-none text-center">EX-LEDGER-SEC</span>
                  </div>

                  {/* signature layout */}
                  <div className="text-right">
                    <span className="text-white/40 block text-[7px] uppercase font-black uppercase mb-0.5">Holder Sign</span>
                    <span className="font-cursive text-indigo-300 italic font-medium font-serif leading-none tracking-tight">{docData.signature || 'Sign'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* 3. Formal Report Layout */}
            {documentTemplate === 'report' && (
              <div id="print-report-container" className="w-full max-w-[620px] bg-white border border-zinc-200/50 p-10 shadow-xl rounded-2xl text-zinc-800 font-sans leading-relaxed text-xs">
                {/* Meta details header strip */}
                <div className="flex justify-between items-center text-[10px] text-zinc-400 border-b border-zinc-100 pb-3 mb-6 font-medium">
                  <span>EXONA DIGITAL REPORTING MODULE</span>
                  <span>DATE: {docData.date || 'MAY 2026'}</span>
                </div>

                {/* Cover Details */}
                <div className="mb-8">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#d97706] mb-1 block">Audit & Ledger Performance</span>
                  <h1 className="text-2xl font-black text-zinc-900 tracking-tight leading-tight mb-2 uppercase">{docData.title || 'Official Report Proposal'}</h1>
                  <p className="text-sm font-semibold text-zinc-500 leading-normal">{docData.subtitle || ''}</p>
                  
                  <div className="flex gap-2 items-center mt-3 text-[10px] font-bold text-zinc-600">
                    <span>Generated by: {docData.author || 'Report Officer'}</span>
                  </div>
                </div>

                {/* Executive Summary Panel */}
                <div className="bg-zinc-50 border-l-4 border-amber-500 p-5 rounded-r-2xl mb-6">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-800 mb-1">Executive Summary</h4>
                  <p className="text-zinc-600 text-xs leading-relaxed text-justify">{docData.executiveSummary || ''}</p>
                </div>

                {/* Key Metric cards */}
                {Array.isArray(docData.keyMetrics) && docData.keyMetrics.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                    {docData.keyMetrics.map((met: any, idx: number) => {
                      const isUp = met.status === 'up';
                      const isDown = met.status === 'down';
                      return (
                        <div key={idx} className="bg-white border border-zinc-100 p-3 rounded-xl shadow-sm flex flex-col justify-between">
                          <span className="text-[9px] uppercase tracking-wider font-bold text-zinc-400 mb-1 block">{met.label}</span>
                          <div className="flex items-baseline justify-between mt-1">
                            <span className="text-sm font-black text-zinc-900">{met.value}</span>
                            {isUp && <TrendingUp size={14} className="text-emerald-500" />}
                            {isDown && <TrendingUp size={14} className="text-rose-500 rotate-180" />}
                            {!isUp && !isDown && <Activity size={14} className="text-zinc-400" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Sections detail block */}
                {Array.isArray(docData.sections) && docData.sections.length > 0 && (
                  <div className="space-y-5 mb-6">
                    {docData.sections.map((sec: any, idx: number) => (
                      <div key={idx} className="space-y-2">
                        <h3 className="font-bold text-sm text-zinc-900 leading-normal border-b border-zinc-100 pb-1">{sec.heading}</h3>
                        <p className="text-zinc-600 leading-relaxed text-justify">{sec.content}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Conclusions */}
                {docData.conclusions && (
                  <div className="mb-6 pt-3 border-t border-zinc-100">
                    <h3 className="font-bold text-sm text-zinc-900 mb-1.5">Conclusions</h3>
                    <p className="text-zinc-600 text-justify leading-relaxed">{docData.conclusions}</p>
                  </div>
                )}

                {/* Recommendations */}
                {Array.isArray(docData.recommendations) && docData.recommendations.length > 0 && (
                  <div className="bg-amber-50/20 border border-amber-100/50 p-4 rounded-xl">
                    <h3 className="font-bold text-sm text-[#b45309] mb-2 uppercase tracking-wide text-xs">Recommended Action Items</h3>
                    <ul className="space-y-1.5 text-zinc-700">
                      {docData.recommendations.map((rec: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-1.5 leading-relaxed text-xs">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-600 mt-1.5 shrink-0"></span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              </div>
            )}

            {/* 4. Ornate Certificate Layout */}
            {documentTemplate === 'certificate' && (
              <div id="print-certificate-container" className="w-full max-w-[620px] aspect-[1.4] bg-[#fdfdfd] border-[12px] border-double border-zinc-300 p-8 shadow-2xl relative rounded-xl flex flex-col justify-between text-zinc-800 text-center font-serif leading-relaxed">
                
                {/* Thin Inner gold card border line */}
                <div className="absolute inset-2 border-2 border-amber-800/20 rounded-md pointer-events-none"></div>
                <div className="absolute top-4 right-4 w-12 h-12 border-t-2 border-r-2 border-amber-700"></div>
                <div className="absolute top-4 left-4 w-12 h-12 border-t-2 border-l-2 border-amber-700"></div>
                <div className="absolute bottom-4 right-4 w-12 h-12 border-b-2 border-r-2 border-amber-700"></div>
                <div className="absolute bottom-4 left-4 w-12 h-12 border-b-2 border-l-2 border-amber-700"></div>

                {/* Logo or Medal icon */}
                <div className="flex justify-center mb-1">
                  <div className="w-14 h-14 bg-amber-50 rounded-full flex items-center justify-center border-2 border-amber-500/30">
                    <Award size={32} className="text-amber-500" />
                  </div>
                </div>

                {/* Broad certificate Header */}
                <div className="space-y-1">
                  <h1 className="text-xl md:text-2xl font-black text-amber-700 uppercase tracking-widest leading-none font-serif">{docData.title || 'Certificate of Excellence'}</h1>
                  <p className="text-[10px] md:text-xs text-zinc-500 italic lowercase tracking-wider">{docData.subtitle || 'This is proudly presented for accomplishment to'}</p>
                </div>

                {/* Recipient */}
                <div className="my-[12px]">
                  <h2 className="text-xl md:text-2xl font-extrabold text-zinc-950 font-serif border-b-2 border-amber-500/20 max-w-[80%] mx-auto pb-1 leading-none tracking-wide">{docData.recipientName || 'Member Name'}</h2>
                </div>

                {/* Description */}
                <div className="max-w-[85%] mx-auto mb-2 text-justify">
                  <p className="text-[9.5px] md:text-[10.5px] text-zinc-500 text-center leading-relaxed font-sans">{docData.achievementDescription || ''}</p>
                </div>

                {/* Authenticator Metadata and Signs */}
                <div className="grid grid-cols-3 gap-4 items-end mt-4 text-[8px] md:text-[9.5px] px-4 font-sans text-left">
                  
                  {/* Left: Certifying Institution */}
                  <div className="space-y-1 border-t border-zinc-100 pt-1.5">
                    <span className="text-zinc-400 block uppercase text-[7px] font-bold">Institution Authority</span>
                    <span className="font-bold text-zinc-700">{docData.institutionName || 'Academy Council'}</span>
                    <span className="text-zinc-500 block">UID Node: #{docData.credentialId || 'EX-9901'}</span>
                  </div>

                  {/* Middle: Ornate Verified Seal block */}
                  <div className="flex flex-col items-center justify-center pb-1">
                    <div className="w-10 h-10 bg-amber-50 border border-amber-500/20 rounded-full flex items-center justify-center flex-col scale-90">
                      <ShieldCheck size={18} className="text-emerald-600 block" />
                      <span className="text-[5px] uppercase font-bold text-emerald-700 tracking-wider">VERIFIED</span>
                    </div>
                  </div>

                  {/* Right: Signature Block */}
                  <div className="space-y-1 text-right border-t border-zinc-100 pt-1.5">
                    <span className="text-zinc-400 block uppercase text-[7px] font-bold">Authorized Signatory</span>
                    <span className="font-cursive italic font-bold select-none text-amber-700 font-serif block text-[11px] leading-tight">{docData.issuerName || 'Signee'}</span>
                    <span className="text-zinc-500 block leading-none">{docData.issuerRole || 'Authority Board'}</span>
                  </div>

                </div>

                {/* Fine security timestamp anchor */}
                <div className="text-[6.5px] font-mono text-zinc-400 mt-2">
                  SECURE VERIFICATION LEDGER AUDITED ON: {docData.issueDate || '2026-05-24'}
                </div>
              </div>
            )}

            {/* 5. Agreement Layout */}
            {documentTemplate === 'agreement' && (
              <div id="print-agreement-container" className="w-full max-w-[620px] bg-white border border-zinc-200/50 p-10 shadow-xl rounded-2xl text-zinc-800 font-serif leading-relaxed text-xs">
                
                {/* Contract title and header */}
                <div className="text-center pb-4 border-b border-zinc-200 mb-6">
                  <h2 className="text-lg font-bold text-zinc-900 tracking-wide uppercase">{docData.title || 'NDA / Partnership Agreement'}</h2>
                  <span className="text-[9.5px] font-sans font-black text-indigo-600 uppercase tracking-widest block mt-0.5">Formal Binding Protocol</span>
                </div>

                {/* Contract Parties */}
                <div className="space-y-2 text-xs leading-relaxed text-justify mb-5 font-sans">
                  <p><strong>EFFECTIVE DATE OF CONCORD:</strong> {docData.effectiveDate || '2026-05-24'}</p>
                  <p>This legally structured document sets out the strategic partnership and operative definitions mutualized between the following signatory participants:</p>
                  <div className="bg-zinc-50 border border-zinc-100 p-3 rounded-lg flex flex-col gap-1 text-[11px]">
                    <p><strong>PARTY ALPHA:</strong> {docData.partyA || 'First Participant description'}</p>
                    <p><strong>PARTY BETA:</strong> {docData.partyB || 'Second Participant description'}</p>
                  </div>
                </div>

                {/* Agreement Clauses */}
                {Array.isArray(docData.clauses) && docData.clauses.length > 0 && (
                  <div className="space-y-4 mb-6">
                    {docData.clauses.map((cl: any, idx: number) => (
                      <div key={idx} className="space-y-1">
                        <h4 className="font-bold text-zinc-900 text-xs uppercase tracking-wide leading-none">{cl.title}</h4>
                        <p className="text-zinc-600 leading-relaxed text-justify text-[11px] font-serif">{cl.content}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Payment terms section */}
                {docData.paymentTerms && (
                  <div className="mb-4">
                    <h4 className="font-bold text-zinc-900 text-xs uppercase tracking-wide mb-1 flex items-center gap-1 font-sans">
                      <TrendingUp size={12} className="text-indigo-600" /> Payment & Disbursement covenants
                    </h4>
                    <p className="text-zinc-600 text-[11.5px] leading-relaxed text-justify bg-indigo-50/20 border border-indigo-100/30 p-2.5 rounded-lg">{docData.paymentTerms}</p>
                  </div>
                )}

                {/* Governing jurisdictions and termination cues */}
                <div className="space-y-3 pt-4 border-t border-zinc-100 text-[11px] font-serif leading-relaxed text-justify">
                  {docData.governingLaw && (
                    <p><strong>GOVERNING LAW JURISDICTION:</strong> This Agreement shall be construed, defended, and validated according to the legislative bodies and court procedures of the registries of <strong>{docData.governingLaw}</strong>.</p>
                  )}
                  {docData.terminationConditions && (
                    <p><strong>CONTRACT COVENANT EXPIRATION:</strong> {docData.terminationConditions}</p>
                  )}
                </div>

                {/* Seal visual marker signature */}
                <div className="grid grid-cols-2 gap-8 items-end mt-10 font-sans text-xs">
                  <div className="border-t border-zinc-300 pt-2 flex flex-col">
                    <span className="text-[7.5px] text-zinc-400 uppercase font-black">Authorized Party A Signatory</span>
                    <span className="italic font-bold font-serif text-indigo-700 text-center select-none py-1.5">{docData.partyA?.substring(0, 15) || 'Signee'}</span>
                    <span className="text-[9.5px] font-semibold text-zinc-500 uppercase">{docData.partyA || 'Seal'}</span>
                  </div>
                  <div className="border-t border-zinc-300 pt-2 flex flex-col">
                    <span className="text-[7.5px] text-zinc-400 uppercase font-black">Authorized Party B Signatory</span>
                    <span className="italic font-bold font-serif text-indigo-700 text-center select-none py-1.5">{docData.partyB?.substring(0, 15) || 'Signee'}</span>
                    <span className="text-[9.5px] font-semibold text-zinc-500 uppercase">{docData.partyB || 'Seal'}</span>
                  </div>
                </div>

              </div>
            )}

            {/* 6. Invoice Layout */}
            {documentTemplate === 'invoice' && (
              <div id="print-invoice-container" className="w-full max-w-[620px] bg-white border border-zinc-200/50 p-10 shadow-xl rounded-2xl text-zinc-800 font-sans leading-relaxed text-xs">
                
                {/* Header Block logo section */}
                <div className="flex justify-between items-start border-b border-zinc-100 pb-6 mb-6">
                  <div>
                    <h2 className="text-xl font-black text-indigo-600 leading-none mb-1 uppercase tracking-wider">DEMAND FOR PAYMENT</h2>
                    <span className="text-[9.5px] text-zinc-400 font-bold block uppercase tracking-wide">Exona Verifiable Invoicing Node</span>
                    <div className="mt-3 text-[10px] space-y-0.5 text-zinc-500 font-medium">
                      <p className="font-bold text-zinc-700">{docData.senderInfo?.name || 'Sender Corporate'}</p>
                      <p>{docData.senderInfo?.address || ''}</p>
                      <p>Phone: {docData.senderInfo?.phone || ''} | Email: {docData.senderInfo?.email || ''}</p>
                      <p>Company Tax No: {docData.senderInfo?.taxId || ''}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="w-8 h-8 bg-indigo-50 border border-indigo-100 text-indigo-600 text-center font-black flex items-center justify-center rounded-xl mb-3 shadow-sm ml-auto">INV</div>
                    <span className="text-zinc-400 text-[8px] uppercase font-bold block mb-0.5">Invoice Number</span>
                    <span className="font-mono text-xs font-bold text-zinc-900 block mb-2">{docData.invoiceNumber || 'EX-INV-000'}</span>
                    <p className="text-[9.5px] text-zinc-500"><strong>BILL DATE:</strong> {docData.invoiceDate}</p>
                    <p className="text-[9.5px] text-rose-500"><strong>DUE DATE:</strong> {docData.dueDate}</p>
                  </div>
                </div>

                {/* Recipient billing */}
                <div className="mb-6 bg-zinc-50 border border-zinc-100 p-4 rounded-xl">
                  <span className="text-zinc-400 text-[8.5px] uppercase font-black block mb-1 tracking-wider">BILLED TO COVENANT:</span>
                  <h4 className="font-bold text-zinc-900 text-xs mb-0.5">{docData.recipientInfo?.name || 'Billed Client Org'}</h4>
                  <p className="text-zinc-500 text-[10px] leading-tight mb-1">{docData.recipientInfo?.address || ''}</p>
                  <p className="text-zinc-500 text-[10px]">Email: {docData.recipientInfo?.email || ''}</p>
                </div>

                {/* Item List Table layout */}
                <div className="mb-6 overflow-hidden border border-zinc-100 rounded-xl shadow-sm">
                  <table className="w-full text-zinc-700 text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-zinc-50/80 border-b border-zinc-100 font-bold text-[9px] uppercase tracking-wider text-zinc-500">
                        <th className="p-3">Item Description</th>
                        <th className="p-3 text-center w-16">Qty</th>
                        <th className="p-3 text-right w-24">Rate (£)</th>
                        <th className="p-3 text-right w-24">Total (£)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50 font-medium">
                      {Array.isArray(docData.items) && docData.items.map((it: any, idx: number) => {
                        const lineTotal = (it.quantity || 1) * (it.rate || 0);
                        return (
                          <tr key={idx} className="hover:bg-zinc-50/30 transition-colors">
                            <td className="p-3 font-semibold text-zinc-800 text-[11px]">{it.description}</td>
                            <td className="p-3 text-center">{it.quantity}</td>
                            <td className="p-3 text-right">£{(it.rate || 0).toFixed(2)}</td>
                            <td className="p-3 text-right font-bold text-zinc-900">£{lineTotal.toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Subtotals & Taxes breakdown summary */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start mb-6">
                  <div className="md:col-span-7 bg-zinc-50/50 p-3 rounded-lg border border-zinc-100 text-[10px] text-zinc-500">
                    <span className="font-bold block text-zinc-700 mb-1 uppercase tracking-wider text-[8px]">Terms & Payment Directions</span>
                    <p className="leading-relaxed">{docData.terms || 'BARCLAYS BANK PLC, LONDON SORT : 20-40-60'}</p>
                  </div>

                  <div className="md:col-span-5 space-y-1.5 text-right font-sans">
                    <div className="flex justify-between items-center text-[10.5px]">
                      <span className="text-zinc-400">Total Subtotal</span>
                      <span className="font-semibold text-zinc-800">£{invoiceNumbers.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10.5px]">
                      <span className="text-zinc-400">Tax Levy ({docData.taxRate || 0}%)</span>
                      <span className="font-semibold text-zinc-800">£{invoiceNumbers.tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center border-t border-zinc-250 pt-2 text-xs">
                      <span className="font-black text-indigo-700 uppercase tracking-wide text-[9.5px]">TOTAL OUTSTANDING DUE</span>
                      <span className="font-black text-zinc-900 text-sm">£{invoiceNumbers.grandTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Notes anchor */}
                {docData.notes && (
                  <div className="text-[10px] text-zinc-400 border-t border-zinc-100 pt-3 text-justify leading-relaxed">
                    <strong>MEMO/NOTE:</strong> {docData.notes}
                  </div>
                )}
              </div>
            )}

            {/* 7. Thermal Receipt Layout */}
            {documentTemplate === 'receipt' && (
              <div id="print-receipt-container" className="w-[300px] bg-slate-50 border border-zinc-300 p-5 shadow-lg rounded text-zinc-800 font-mono leading-tight text-[10px]">
                {/* Header thermal layout */}
                <div className="text-center border-b border-dashed border-zinc-400 pb-3 mb-3">
                  <h3 className="font-bold text-xs uppercase tracking-wide">{docData.merchantInfo?.name || 'EXONA COFFEE CAFE'}</h3>
                  <p className="text-[8.5px] text-zinc-500">{docData.merchantInfo?.address || 'Silicon Lane'}</p>
                  <p className="text-[8.5px] text-zinc-500">TEL: {docData.merchantInfo?.phone || '+44 20'}</p>
                  <p className="text-[8.5px] text-zinc-500">UTC: {docData.transactionDate || '2026-05'}</p>
                </div>

                {/* Metadata customer / trans */}
                <div className="space-y-1 border-b border-dashed border-zinc-400 pb-2 mb-2 font-mono text-[9px]">
                  <p><strong>RECEIPT ID:</strong> {docData.receiptNumber || 'REC-00000'}</p>
                  <p><strong>CUSTOMER:</strong> {docData.customerName || 'Sophia Jenkins'}</p>
                  <p><strong>CASHIER:</strong> {docData.cashier || 'Sophia Jenkins'}</p>
                </div>

                {/* Items thermal layout line */}
                <div className="space-y-1.5 border-b border-dashed border-zinc-400 pb-2 mb-2">
                  <div className="flex justify-between font-bold border-b border-dotted border-zinc-300 pb-0.5 text-[8.5px]">
                    <span>ITEM NAME</span>
                    <span>PRICE (£)</span>
                  </div>
                  {Array.isArray(docData.items) && docData.items.map((it: any, idx: number) => (
                    <div key={idx} className="flex justify-between font-mono">
                      <span>{it.name}</span>
                      <span>£{(it.amount || 0).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                {/* Sum thermal breakdown */}
                <div className="space-y-1 font-mono text-right pb-2 border-b border-dashed border-zinc-400 mb-2">
                  <div className="flex justify-between text-[9px]">
                    <span>SUBTOTAL</span>
                    <span>£{(docData.subtotal || 0).toFixed(2)}</span>
                  </div>
                  {docData.discount > 0 && (
                    <div className="flex justify-between text-[9px] text-emerald-600">
                      <span>DISCOUNT APPLIED</span>
                      <span>-£{(docData.discount || 0).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[9px]">
                    <span>VAT LEVY</span>
                    <span>£{(docData.tax || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-xs pt-1 text-zinc-900 border-t border-dotted border-zinc-300 leading-none">
                    <span>TOTAL PAID GBP</span>
                    <span>£{(docData.totalAmount || 0).toFixed(2)}</span>
                  </div>
                </div>

                {/* Payment channel footer */}
                <div className="text-center font-mono space-y-1 pt-1.5">
                  <p className="uppercase">PAYMENT MODE: {docData.paymentMethod || 'DEBIT CARD'}</p>
                  <p className="text-[7.5px] text-zinc-400 uppercase tracking-widest mt-2 font-mono">*** THANK YOU FOR VISITING EXONA! ***</p>
                </div>
              </div>
            )}

            {documentTemplate === 'coreldraw' && (
              <div id="print-coreldraw-container" className="w-full flex flex-col items-center bg-zinc-900 leading-normal p-6 shadow-2xl rounded-3xl text-zinc-300 font-sans border-t-4 border-pink-500 max-w-[750px]">
                {/* Vector Canvas Ruler and Status */}
                <div className="w-full flex items-center justify-between mb-4 bg-zinc-950 px-4 py-2.5 rounded-2xl border border-zinc-800 text-[10px] select-none text-zinc-400 font-mono">
                  <div className="flex items-center gap-2">
                    <Ruler size={12} className="text-pink-500 animate-pulse" />
                    <span>RULER SYSTEM (px): H: 0-{docData.canvasSize?.width || 600} | V: 0-{docData.canvasSize?.height || 400}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-emerald-400">
                      <Grid size={11} /> Grid Snapping ON
                    </span>
                    <span className="text-pink-500">Vector Workspace</span>
                  </div>
                </div>

                {/* Outer Svg Holder with Rulers */}
                <div className="relative w-full overflow-hidden flex flex-col items-center bg-zinc-950 p-4 border border-zinc-800 rounded-2xl shadow-inner">
                  {/* Standard CSS Grid overlay for pixel grid simulation */}
                  <div 
                    className="relative border border-zinc-700/60 overflow-hidden shadow-2xl transition-all"
                    style={{
                      width: `${docData.canvasSize?.width || 600}px`,
                      height: `${docData.canvasSize?.height || 400}px`,
                      maxWidth: '100%',
                    }}
                  >
                    {/* CSS grid overlay pattern */}
                    <div 
                      className="absolute inset-0 pointer-events-none opacity-[0.06]"
                      style={{
                        backgroundImage: `radial-gradient(#ffffff 1px, transparent 1px), radial-gradient(#ffffff 1px, transparent 1px)`,
                        backgroundSize: '20px 20px',
                        backgroundPosition: '0 0, 10px 10px'
                      }}
                    ></div>

                    {/* True SVG Render Engine */}
                    <svg
                      id="coreldraw-svg-canvas"
                      viewBox={`0 0 ${docData.canvasSize?.width || 600} ${docData.canvasSize?.height || 400}`}
                      className="w-full h-full select-none"
                      style={{
                        background: docData.canvasSize?.background || '#0f172a'
                      }}
                    >
                      {/* Font pairing import */}
                      <style>{`
                        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;700;900&family=JetBrains+Mono:wght@400;700&display=swap');
                        .vector-shape:hover { stroke-width: 3px !important; stroke: #ec4899 !important; cursor: pointer; filter: brightness(1.15); }
                      `}</style>

                      {/* Fountain Gradients definitions */}
                      <defs>
                        {Array.isArray(docData.layers) && docData.layers.flatMap((lyr: any) => lyr.elements || []).map((e: any) => {
                          if (e.gradientType === 'linear' && Array.isArray(e.gradientColors)) {
                            return (
                              <linearGradient 
                                id={`grad-${e.id}`} 
                                key={e.id} 
                                x1="0%" 
                                y1="0%" 
                                x2="100%" 
                                y2="100%"
                                gradientTransform={`rotate(${e.gradientAngle || 45})`}
                              >
                                {e.gradientColors.map((c: string, idx: number) => (
                                  <stop key={idx} offset={`${(idx / (e.gradientColors.length - 1)) * 100}%`} stopColor={c} />
                                ))}
                              </linearGradient>
                            );
                          } else if (e.gradientType === 'radial' && Array.isArray(e.gradientColors)) {
                            return (
                              <radialGradient id={`grad-${e.id}`} key={e.id} cx="50%" cy="50%" r="50%">
                                {e.gradientColors.map((c: string, idx: number) => (
                                  <stop key={idx} offset={`${(idx / (e.gradientColors.length - 1)) * 100}%`} stopColor={c} />
                                ))}
                              </radialGradient>
                            );
                          }
                          return null;
                        })}
                      </defs>

                      {/* Snap Guides Lines (CorelDRAW Signature blue lines helper) */}
                      <g className="snap-guidelines opacity-30 pointer-events-none" stroke="#38bdf8" strokeWidth={0.7} strokeDasharray="4,4">
                        <line x1={0} y1={100} x2={docData.canvasSize?.width || 600} y2={100} />
                        <line x1={0} y1={300} x2={docData.canvasSize?.width || 600} y2={300} />
                        <line x1={150} y1={0} x2={150} y2={docData.canvasSize?.height || 400} />
                        <line x1={450} y1={0} x2={450} y2={docData.canvasSize?.height || 400} />
                      </g>

                      {/* Design Layers Stack */}
                      {Array.isArray(docData.layers) && docData.layers.map((layer: any) => {
                        if (layer.visible === false) return null;

                        return (
                          <g 
                            key={layer.id} 
                            id={layer.id} 
                            opacity={layer.opacity ?? 1}
                            style={{ pointerEvents: layer.locked ? 'none' : 'auto' }}
                          >
                            {Array.isArray(layer.elements) && layer.elements.map((e: any) => {
                              // Define fill URL or color
                              const elFill = (e.gradientType !== 'none' && e.gradientType) ? `url(#grad-${e.id})` : e.fill;
                              const eStroke = e.stroke || 'none';
                              const eStrokeWidth = e.strokeWidth ?? 1;
                              const eDash = e.strokeDasharray !== 'none' ? e.strokeDasharray : undefined;

                              // Process concentric contour glows (Special CorelDRAW interactive feature)
                              const contours = [];
                              if (e.contourCount > 0 && e.contourColor) {
                                for (let i = e.contourCount; i > 0; i--) {
                                  contours.push(i);
                                }
                              }

                              return (
                                <g key={e.id} id={`group-${e.id}`} transform={e.rotation ? `rotate(${e.rotation}, ${e.x + (e.width || 0)/2}, ${e.y + (e.height || 0)/2})` : undefined}>
                                  {/* RENDER DYNAMIC CONTOUR PATHS BELOW (underneath the shape) */}
                                  {contours.map((step) => {
                                    const spread = step * 6; // progress outward spacing
                                    if (e.type === 'ellipse') {
                                      return (
                                        <ellipse 
                                          key={`contour-${e.id}-${step}`}
                                          cx={e.cx || e.x} 
                                          cy={e.cy || e.y} 
                                          rx={(e.r || e.width/2 || 40) + spread} 
                                          ry={(e.r || e.height/2 || 40) + spread}
                                          fill="none"
                                          stroke={e.contourColor}
                                          strokeWidth={eStrokeWidth + 1}
                                          opacity={0.35 - (step * 0.06)}
                                        />
                                      );
                                    } else if (e.type === 'rect') {
                                      return (
                                        <rect 
                                          key={`contour-${e.id}-${step}`}
                                          x={e.x - spread} 
                                          y={e.y - spread} 
                                          width={(e.width || 100) + (spread * 2)} 
                                          height={(e.height || 80) + (spread * 2)}
                                          rx={(e.rx || 0) + (spread/2)}
                                          ry={(e.rx || 0) + (spread/2)}
                                          fill="none"
                                          stroke={e.contourColor}
                                          strokeWidth={eStrokeWidth + 1}
                                          opacity={0.35 - (step * 0.06)}
                                        />
                                      );
                                    }
                                    return null;
                                  })}

                                  {/* MAIN GEOMETRIC RENDER BLOCK */}
                                  {e.type === 'rect' && (
                                    <rect
                                      id={e.id}
                                      x={e.x}
                                      y={e.y}
                                      width={e.width || 100}
                                      height={e.height || 80}
                                      rx={e.rx || 0}
                                      ry={e.rx || 0}
                                      fill={elFill}
                                      stroke={eStroke}
                                      strokeWidth={eStrokeWidth}
                                      strokeDasharray={eDash}
                                      className="vector-shape transition-all duration-300"
                                    />
                                  )}

                                  {e.type === 'ellipse' && (
                                    <ellipse
                                      id={e.id}
                                      cx={e.cx || e.x}
                                      cy={e.cy || e.y}
                                      rx={e.r || e.width/2 || 30}
                                      ry={e.r || e.height/2 || 30}
                                      fill={elFill}
                                      stroke={eStroke}
                                      strokeWidth={eStrokeWidth}
                                      strokeDasharray={eDash}
                                      className="vector-shape transition-all duration-300"
                                    />
                                  )}

                                  {e.type === 'path' && (
                                    <path
                                      id={e.id}
                                      d={e.d || "M 50 50 L 150 150"}
                                      fill={elFill || 'none'}
                                      stroke={eStroke}
                                      strokeWidth={eStrokeWidth}
                                      strokeDasharray={eDash}
                                      className="vector-shape transition-all duration-300"
                                    />
                                  )}

                                  {e.type === 'star' && (
                                    <polygon
                                      id={e.id}
                                      points={e.points || "100,50 115,85 150,85 122,105 132,140 100,120 68,140 78,105 50,85 85,85"}
                                      fill={elFill}
                                      stroke={eStroke}
                                      strokeWidth={eStrokeWidth}
                                      strokeDasharray={eDash}
                                      className="vector-shape transition-all duration-300"
                                    />
                                  )}

                                  {e.type === 'polygon' && (
                                    <polygon
                                      id={e.id}
                                      points={e.points || "100,50 150,85 150,135 100,170 50,135 50,85"}
                                      fill={elFill}
                                      stroke={eStroke}
                                      strokeWidth={eStrokeWidth}
                                      strokeDasharray={eDash}
                                      className="vector-shape transition-all duration-300"
                                    />
                                  )}

                                  {e.type === 'line' && (
                                    <line
                                      id={e.id}
                                      x1={e.x}
                                      y1={e.y}
                                      x2={e.x + (e.width || 100)}
                                      y2={e.y + (e.height || 0)}
                                      stroke={eStroke || '#ffffff'}
                                      strokeWidth={eStrokeWidth}
                                      strokeDasharray={eDash}
                                      className="vector-shape transition-all duration-300"
                                    />
                                  )}

                                  {e.type === 'text' && (
                                    <text
                                      id={e.id}
                                      x={e.x}
                                      y={e.y}
                                      fontSize={e.fontSize || 16}
                                      fontWeight={e.fontWeight || 'normal'}
                                      fontFamily={e.fontFamily || 'sans-serif'}
                                      fill={elFill || '#ffffff'}
                                      stroke={eStroke}
                                      strokeWidth={eStrokeWidth}
                                      textAnchor="start"
                                      className="vector-shape filter"
                                    >
                                      {e.text || 'CorelDRAW AI Vector Text'}
                                    </text>
                                  )}
                                </g>
                              );
                            })}
                          </g>
                        );
                      })}

                      {/* Dimension Lines System Renders */}
                      {Array.isArray(docData.dimensionLines) && docData.dimensionLines.map((dl: any, idx: number) => {
                        const dx = dl.x2 - dl.x1;
                        const dy = dl.y2 - dl.y1;
                        const len = Math.max(0.1, Math.sqrt(dx*dx + dy*dy));
                        const midX = (dl.x1 + dl.x2) / 2;
                        const midY = (dl.y1 + dl.y2) / 2;
                        const angle = Math.atan2(dy, dx) * 180 / Math.PI;

                        return (
                          <g key={idx} className="dimension-line font-mono text-[9px]" fill={dl.color || '#38bdf8'}>
                            {/* Main Dimension bracket */}
                            <line x1={dl.x1} y1={dl.y1} x2={dl.x2} y2={dl.y2} stroke={dl.color || '#38bdf8'} strokeWidth={1} />
                            {/* Double perpendicular ends (ticks) */}
                            <line 
                              x1={dl.x1 - dy*6/len} y1={dl.y1 + dx*6/len} 
                              x2={dl.x1 + dy*6/len} y2={dl.y1 - dx*6/len} 
                              stroke={dl.color || '#38bdf8'} strokeWidth={1.5} 
                            />
                            <line 
                              x1={dl.x2 - dy*6/len} y1={dl.y2 + dx*6/len} 
                              x2={dl.x2 + dy*6/len} y2={dl.y2 - dx*6/len} 
                              stroke={dl.color || '#38bdf8'} strokeWidth={1.5} 
                            />
                            {/* Value Label */}
                            <g transform={`translate(${midX}, ${midY - 8}) rotate(${angle}, 0, 0)`}>
                              <text textAnchor="middle" fill="#38bdf8" className="font-bold bg-zinc-950 px-1 py-0.5" transform="scale(1)">
                                {dl.label}
                              </text>
                            </g>
                          </g>
                        );
                      })}
                    </svg>

                    {/* Blue dynamic guide-node box overlay on hovered SVG objects */}
                    <div className="absolute top-[10%] left-[8%] border border-dashed border-pink-500 text-[8px] bg-pink-500/10 px-1 text-pink-300 py-0.5 rounded pointer-events-none opacity-85 select-none font-mono">
                      Bounding Node: Star-Effect
                    </div>
                  </div>
                </div>

                {/* CorelDRAW Vector Engine Specs Meter */}
                <div className="w-full mt-4 p-3 bg-zinc-950 border border-zinc-800 rounded-2xl grid grid-cols-3 gap-2 text-center text-[9px] font-mono text-zinc-400 font-bold tracking-tight uppercase">
                  <div>
                    <span className="block text-[11px] text-pink-400 font-black font-mono">
                      {Array.isArray(docData.layers) ? docData.layers.length : 0}
                    </span>
                    <span>Layers</span>
                  </div>
                  <div className="border-x border-zinc-800">
                    <span className="block text-[11px] text-emerald-400 font-black font-mono">
                      {Array.isArray(docData.layers) ? docData.layers.flatMap((l: any) => l.elements || []).length : 0}
                    </span>
                    <span>Shapes</span>
                  </div>
                  <div>
                    <span className="block text-[11px] text-blue-400 font-black font-mono">
                      {Array.isArray(docData.dimensionLines) ? docData.dimensionLines.length : 0}
                    </span>
                    <span>Dimensions</span>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>

      {/* Global CSS Injecting standard printing styles so it only prints the document element properly */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
            background: white !important;
            box-shadow: none !important;
          }
          .no-print, .no-print * {
            display: none !important;
            height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          #print-cv-container, #print-cv-container * {
            visibility: visible !important;
          }
          #print-cv-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          #print-id-card-container, #print-id-card-container * {
            visibility: visible !important;
          }
          #print-id-card-container {
            position: absolute !important;
            left: 10% !important;
            top: 10% !important;
            border: 4px border-zinc-800 !important;
            box-shadow: none !important;
          }
          #print-report-container, #print-report-container * {
            visibility: visible !important;
          }
          #print-report-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          #print-certificate-container, #print-certificate-container * {
            visibility: visible !important;
          }
          #print-certificate-container {
            position: absolute !important;
            left: 5% !important;
            top: 10% !important;
            width: 90% !important;
            border: 12px double #d97706 !important;
            box-shadow: none !important;
          }
          #print-agreement-container, #print-agreement-container * {
            visibility: visible !important;
          }
          #print-agreement-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          #print-invoice-container, #print-invoice-container * {
            visibility: visible !important;
          }
          #print-invoice-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          #print-receipt-container, #print-receipt-container * {
            visibility: visible !important;
          }
          #print-receipt-container {
            position: absolute !important;
            left: 20% !important;
            top: 10% !important;
            border: 1px border-zinc-305 !important;
            box-shadow: none !important;
          }
        }
      `}</style>

    </div>
  );
}
