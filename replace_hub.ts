export const hubCode = `
      case 'hub': {
        const isAdmin = userDoc?.role === 'admin' || user?.email === 'musstaphamusa@gmail.com';
        
        const hubAppsList = [
          {
            id: 'exona_app',
            name: 'ExonaApp',
            description: 'Official APK',
            icon: Smartphone,
            onOpen: () => setView('feed'),
            webUrl: 'https://exonaapp.com',
            downloadUrl: 'https://median.co/share/yexkojn#apk'
          },
          {
            id: 'nexclass',
            name: 'Nexclass',
            description: 'Academic records',
            icon: GraduationCap,
            onOpen: () => setView('nexclass'),
            webUrl: 'https://nexclass.exonaapp.com',
            downloadUrl: 'https://median.co/share/xlzeokm#apk'
          },
          {
            id: 'brainb',
            name: 'BrainB',
            description: 'Live assessments',
            icon: BrainCircuit,
            onOpen: () => setView('brainb'),
            webUrl: 'https://brainb.exonaapp.com',
            downloadUrl: 'https://median.co/share/pbqqoyr#apk'
          },
          {
            id: 'exona_cinema',
            name: 'Cinema',
            description: 'Movies and shows',
            icon: Film,
            onOpen: () => setView('cinema'),
            webUrl: 'https://cinema.exonaapp.com',
            onDownload: () => showNotification('Downloading Exona Cinema...', 'success')
          },
          {
            id: 'exona_shop',
            name: 'Shop',
            description: 'Premium items',
            icon: ShoppingBag,
            onOpen: () => setView('schools'),
            webUrl: 'https://shoppingtime.exonaapp.com',
            downloadUrl: 'https://median.co/share/dyzwnoe#apk'
          },
          {
            id: 'exona_satellite',
            name: 'Satellite',
            description: 'Connect globally',
            icon: Globe,
            onOpen: () => showNotification('Opening Exona Satellite...', 'success'),
            webUrl: 'https://satellite.exonaapp.com',
            onDownload: () => showNotification('Downloading Exona Satellite...', 'success')
          }
        ];

        const selectedApp = hubAppsList.find(app => app.id === selectedHubAppId);

        return (
          <div className="flex-1 flex flex-col bg-slate-50 h-full overflow-y-auto pb-28 relative">
            <div className="p-5 sm:p-8 md:p-10 max-w-4xl mx-auto w-full space-y-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setView('feed')}
                    className="h-[46px] w-[46px] bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-all shadow-sm active:scale-95 cursor-pointer shrink-0"
                    title="Back to Feed"
                  >
                    <ArrowLeft size={20} strokeWidth={2} />
                  </button>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Exona Hub</h1>
                    <p className="text-[13px] sm:text-sm font-medium text-slate-500 mt-0.5">Select an app to launch</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 sm:gap-4">
                {hubAppsList.map((app) => (
                  <button
                    key={app.id}
                    onClick={() => setSelectedHubAppId(app.id)}
                    className="flex flex-col items-center gap-3 p-4 bg-white border border-slate-100 rounded-3xl shadow-sm hover:shadow-md transition-all active:scale-95 group cursor-pointer"
                  >
                    <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center relative overflow-hidden group-hover:bg-[#0B57D0]/5 transition-colors">
                      {hubAppCustomIcons[app.id] ? (
                        <img src={hubAppCustomIcons[app.id]} className="h-full w-full object-cover" alt={app.name} referrerPolicy="no-referrer" />
                      ) : (
                        <app.icon size={28} className="text-[#0B57D0]" />
                      )}
                      
                      {isAdmin && (
                        <label 
                          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity z-10"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {uploadingHubAppId === app.id ? (
                            <RefreshCw size={16} className="text-white animate-spin" />
                          ) : (
                            <Camera size={16} className="text-white" />
                          )}
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleUploadHubAppIcon(app.id, file);
                            }}
                          />
                        </label>
                      )}
                    </div>
                    <span className="text-xs sm:text-[13px] font-bold text-slate-800 text-center leading-tight">{app.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Selected App Modal */}
            <AnimatePresence>
              {selectedHubAppId && selectedApp && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setSelectedHubAppId(null)}
                    className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]"
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 100, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 100, scale: 0.95 }}
                    className="fixed bottom-0 left-0 right-0 sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 w-full sm:max-w-md bg-white rounded-t-[2rem] sm:rounded-[2.5rem] p-6 shadow-2xl z-[110] border border-slate-100"
                  >
                    <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6 sm:hidden" />
                    
                    <div className="flex items-center gap-5 mb-8">
                      <div className="h-20 w-20 rounded-[1.5rem] bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                        {hubAppCustomIcons[selectedApp.id] ? (
                          <img src={hubAppCustomIcons[selectedApp.id]} className="h-full w-full object-cover" alt={selectedApp.name} referrerPolicy="no-referrer" />
                        ) : (
                          <selectedApp.icon size={36} className="text-[#0B57D0]" />
                        )}
                      </div>
                      <div>
                        <h2 className="text-xl font-black text-slate-900 mb-1">{selectedApp.name}</h2>
                        <p className="text-sm font-medium text-slate-500 leading-tight">{selectedApp.description}</p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3">
                      <button 
                        onClick={() => {
                          setSelectedHubAppId(null);
                          selectedApp.onOpen();
                        }}
                        className="w-full h-14 bg-[#0B57D0] hover:bg-[#0842A0] text-white font-bold text-[15px] rounded-2xl transition-colors cursor-pointer active:scale-[0.98]"
                      >
                        Open App
                      </button>
                      <div className="flex gap-3">
                        <a 
                          href={selectedApp.webUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => setSelectedHubAppId(null)}
                          className="flex-1 h-12 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-[13px] rounded-2xl flex items-center justify-center transition-colors cursor-pointer active:scale-[0.98]"
                        >
                          Web Version
                        </a>
                        {selectedApp.downloadUrl ? (
                          <a 
                            href={selectedApp.downloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => setSelectedHubAppId(null)}
                            className="flex-1 h-12 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-[13px] rounded-2xl flex items-center justify-center transition-colors cursor-pointer active:scale-[0.98]"
                          >
                            Download
                          </a>
                        ) : (
                          <button 
                            onClick={() => {
                                if (selectedApp.onDownload) selectedApp.onDownload();
                                setSelectedHubAppId(null);
                            }}
                            className="flex-1 h-12 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-[13px] rounded-2xl flex items-center justify-center transition-colors cursor-pointer active:scale-[0.98]"
                          >
                            Download
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        );
      }
`;
