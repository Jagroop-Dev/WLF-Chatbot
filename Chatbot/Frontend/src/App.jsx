import React, { useState, useEffect, useRef } from 'react';

const apiUrl ='http://127.0.0.1:5000';

const App = () => {

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isApiLoading, setIsApiLoading] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [currentPage, setCurrentPage] = useState('chat');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [settings, setSettings] = useState({
    theme: 'dark',
    fontSize: 16,
    reduceMotion: false
  });

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);


  const STORAGE_KEYS = {
    conversations: 'tlou_conversations',
    settings: 'tlou_settings',
    currentChatId: 'tlou_current_chat_id'
  };

 
  useEffect(() => {
    try {

      const savedSettings = localStorage.getItem(STORAGE_KEYS.settings);
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings(parsedSettings);
        setTheme(parsedSettings.theme);
      }

   
      const savedConversations = localStorage.getItem(STORAGE_KEYS.conversations);
      if (savedConversations) {
        const parsedConversations = JSON.parse(savedConversations);
        setConversations(parsedConversations);
      }

      const savedCurrentChatId = localStorage.getItem(STORAGE_KEYS.currentChatId);
      if (savedCurrentChatId && savedConversations) {
        const parsedConversations = JSON.parse(savedConversations);
        const chatExists = parsedConversations.find(conv => conv.id === savedCurrentChatId);
        if (chatExists) {
          setCurrentChatId(savedCurrentChatId);
          setMessages(chatExists.messages || []);
        }
      }

     
      if (!savedConversations || JSON.parse(savedConversations).length === 0) {
        handleNewChat();
      }
    } catch (error) {
      console.error('Error loading data from localStorage:', error);
      handleNewChat();
    }
  }, []);

 
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isApiLoading]);

  
  useEffect(() => {
    if (conversations.length > 0) {
      localStorage.setItem(STORAGE_KEYS.conversations, JSON.stringify(conversations));
    }
  }, [conversations]);


  useEffect(() => {
    if (currentChatId) {
      localStorage.setItem(STORAGE_KEYS.currentChatId, currentChatId);
    }
  }, [currentChatId]);

 
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
  }, [settings]);

 
  const generateUniqueId = () => {
    return 'id-' + Date.now() + '-' + Math.random().toString(16).slice(2);
  };


  const handleNewChat = () => {
    const newChatId = generateUniqueId();
    const newChat = {
      id: newChatId,
      name: 'New Conversation',
      messages: [],
      createdAt: new Date().toISOString()
    };

    setConversations(prev => [newChat, ...prev]);
    setCurrentChatId(newChatId);
    setMessages([]);
    setCurrentPage('chat');
    setIsSidebarOpen(false);
  };


  const handleSelectChat = (chatId) => {
    const selectedChat = conversations.find(conv => conv.id === chatId);
    if (selectedChat) {
      setCurrentChatId(chatId);
      setMessages(selectedChat.messages || []);
      setCurrentPage('chat');
      setIsSidebarOpen(false);
    }
  };

  
  const handleDeleteChat = (chatId) => {
    setConversations(prev => prev.filter(conv => conv.id !== chatId));
    
    if (currentChatId === chatId) {
      const remainingConversations = conversations.filter(conv => conv.id !== chatId);
      if (remainingConversations.length > 0) {
        handleSelectChat(remainingConversations[0].id);
      } else {
        handleNewChat();
      }
    }
  };


  const handleEditTitle = (chatId, newTitle) => {
    setConversations(prev => prev.map(conv => 
      conv.id === chatId ? { ...conv, name: newTitle } : conv
    ));
  };

 
  const updateSettings = (key, value) => {
    setSettings(prev => {
      const newSettings = { ...prev, [key]: value };
      if (key === 'theme') {
        setTheme(value);
      }
      return newSettings;
    });
  };

 
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() || isApiLoading) return;

    const userMessage = {
      id: Date.now(),
      text: newMessage,
      sender: 'user',
      timestamp: new Date().toISOString()
    };

    
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setNewMessage('');
    setIsApiLoading(true);

   
    setConversations(prev => prev.map(conv => 
      conv.id === currentChatId 
        ? { ...conv, messages: updatedMessages, name: conv.name === 'New Conversation' ? userMessage.text.slice(0, 50) + '...' : conv.name }
        : conv
    ));

    try {
    const response = await fetch(`${apiUrl}/ask`, { // <-- Change is here
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: userMessage.text }),
    });

      if (!response.ok) {
        throw new Error(`API call failed with status: ${response.status}`);
      }

      const data = await response.json();
      const botMessage = {
        id: Date.now() + 1,
        text: data.answer,
        sender: 'bot',
        timestamp: new Date().toISOString()
      };

      const finalMessages = [...updatedMessages, botMessage];
      setMessages(finalMessages);

      
      setConversations(prev => prev.map(conv => 
        conv.id === currentChatId 
          ? { ...conv, messages: finalMessages }
          : conv
      ));

    } catch (error) {
      console.error("Failed to send message or get bot response:", error);
      const errorMessage = {
        id: Date.now() + 1,
        text: "Sorry, I'm having trouble connecting right now. Please try again later.",
        sender: 'bot',
        timestamp: new Date().toISOString()
      };

      const finalMessages = [...updatedMessages, errorMessage];
      setMessages(finalMessages);

     
      setConversations(prev => prev.map(conv => 
        conv.id === currentChatId 
          ? { ...conv, messages: finalMessages }
          : conv
      ));
    } finally {
      setIsApiLoading(false);
    }
  };


  const currentChat = conversations.find(conv => conv.id === currentChatId);


  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    updateSettings('theme', newTheme);
  };


  const ChatItem = ({ chat, onSelect, onDelete, onEdit }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [title, setTitle] = useState(chat.name);
    const inputRef = useRef(null);

    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        onEdit(chat.id, title);
        setIsEditing(false);
      }
      if (e.key === 'Escape') {
        setTitle(chat.name);
        setIsEditing(false);
      }
    };

    useEffect(() => {
      if (isEditing) {
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }, [isEditing]);

    const isActive = currentPage === 'chat' && currentChatId === chat.id;

    return (
      <div
        className={`group relative flex items-center gap-3 p-3 rounded-lg cursor-pointer ${settings.reduceMotion ? '' : 'transition-all duration-200'} focus-within:ring-2 focus-within:ring-offset-2
            ${isActive
            ? theme === 'dark'
              ? 'bg-blue-500/20 backdrop-blur-sm border border-blue-400/30 focus-within:ring-blue-500'
              : 'bg-blue-600/20 backdrop-blur-sm border border-blue-400/30 focus-within:ring-blue-500'
            : theme === 'dark'
              ? 'hover:bg-slate-700/40 focus-within:ring-slate-500'
              : 'hover:bg-gray-200/60 focus-within:ring-gray-400'
          }`}
        onClick={() => !isEditing && onSelect(chat.id)}
      >
        <ChatDotsIcon className={theme === 'dark' ? 'text-white' : 'text-gray-900'} />

        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => {
              onEdit(chat.id, title);
              setIsEditing(false);
            }}
            onKeyDown={handleKeyDown}
            className={`flex-1 bg-transparent outline-none text-sm font-medium
                ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}
            aria-label="Edit chat name"
          />
        ) : (
          <span className={`flex-1 text-sm font-medium truncate
              ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {chat.name}
          </span>
        )}

        <div className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 ${settings.reduceMotion ? '' : 'transition-opacity'}`}>
          <button
            onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
            className={`p-1.5 rounded-md ${settings.reduceMotion ? '' : 'transition-colors'} focus:outline-none focus:ring-2 focus:ring-offset-1
                ${theme === 'dark' ? 'hover:bg-slate-600/40 focus:ring-slate-500' : 'hover:bg-gray-300/60 focus:ring-gray-400'}`}
            aria-label="Edit chat"
          >
            <PencilIcon className={theme === 'dark' ? 'text-white' : 'text-gray-900'} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(chat.id); }}
            className={`p-1.5 rounded-md ${settings.reduceMotion ? '' : 'transition-colors'} focus:outline-none focus:ring-2 focus:ring-offset-1
                ${theme === 'dark' ? 'hover:bg-red-500/20 text-red-400 focus:ring-red-500' : 'hover:bg-red-100 text-red-600 focus:ring-red-500'}`}
            aria-label="Delete chat"
          >
            <TrashIcon />
          </button>
        </div>
      </div>
    );
  };

  
  const NavItem = ({ icon, label, page, onClick }) => {
    const isActive = currentPage === page;
    return (
      <button
        onClick={onClick}
        className={`flex items-center gap-3 w-full p-3 rounded-lg ${settings.reduceMotion ? '' : 'transition-all duration-200'} focus:outline-none focus:ring-2 focus:ring-offset-2
            ${isActive
            ? theme === 'dark'
              ? 'bg-blue-500/20 border border-blue-400/30 focus:ring-blue-500'
              : 'bg-blue-600/20 border border-blue-400/30 focus:ring-blue-500'
            : theme === 'dark'
              ? 'hover:bg-slate-700/40 focus:ring-slate-500'
              : 'hover:bg-gray-200/60 focus:ring-gray-400'
          }`}
        aria-label={`Navigate to ${label}`}
      >
        <span className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>{icon}</span>
        <span className={`text-sm font-medium
            ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          {label}
        </span>
      </button>
    );
  };


  const renderMainContent = () => {
    if (currentPage === 'trophies') {
      return <TrophyPage theme={theme} settings={settings} />;
    }

    if (currentPage === 'collectibles') {
      return <CollectiblesPage theme={theme} settings={settings} />;
    }

    if (currentPage === 'settings') {
      return <SettingsPage theme={theme} settings={settings} updateSettings={updateSettings} />;
    }

    return (
      <>
        {/* Messages */}
        <main className="flex-1 overflow-y-auto" style={{ fontSize: `${settings.fontSize}px` }}>
          {(!currentChat || currentChat.messages.length === 0) ? (
            <div className="flex items-center justify-center h-full p-8">
              <div className="text-center max-w-2xl">
                <div className={`w-16 h-16 mx-auto mb-6 rounded-2xl flex items-center justify-center backdrop-blur-xl border shadow-lg
                    ${theme === 'dark' ? 'bg-blue-500/20 border-blue-400/30' : 'bg-blue-600/10 border-blue-400/30'}`}>
                  <BotIcon className={theme === 'dark' ? 'text-blue-400' : 'text-blue-600'} />
                </div>
                <h3 className={`text-2xl font-bold mb-3
                    ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Welcome to The Last of Us Part 2 Bot
                </h3>
                <p className={`text-lg leading-relaxed
                    ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Ask me anything about the world of The Last of Us Part 2. I can discuss characters, storylines, gameplay, and the post-apocalyptic world that Ellie and Abby navigate.
                </p>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto p-6 space-y-6">
              {messages.map((message) => {
                const isImage = message.type === 'image';

                return (
                  <div key={message.id} className={`flex gap-4 ${message.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
          ${message.sender === 'user' ? 'bg-emerald-600' : 'bg-blue-600'}`}>
                      {message.sender === 'user' ? (
                        <UserCircleIcon className="w-5 h-5 text-white" />
                      ) : (
                        <BotIcon className={`w-5 h-5 ${theme === 'dark' ? 'text-blue-400' : 'text-emerald-600'}`} />
                      )}
                    </div>
                    <div className={`flex-1 max-w-3xl p-4 rounded-2xl relative backdrop-blur-xl border shadow-lg
         ${message.sender === 'user' 
           ? theme === 'dark' 
             ? 'bg-emerald-600/20 border-emerald-400/30 text-white' 
             : 'bg-emerald-600/20 border-emerald-400/30 text-gray-900'
           : theme === 'dark'
             ? 'bg-blue-600/20 border-blue-400/30 text-white'
             : 'bg-blue-600/20 border-blue-400/30 text-gray-900'}`}>
                      {isImage ? (
                        <img src={message.src} alt="Relevant image" className="mt-4 rounded-lg w-full max-h-64 object-contain" />
                      ) : (
                        <p className="leading-relaxed whitespace-pre-wrap">{message.text}</p>
                      )}
                    </div>
                  </div>
                );
              })}

              {isApiLoading && (
                <div className="flex gap-4">
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
                      ${theme === 'dark' ? 'bg-blue-500/20 backdrop-blur-sm' : 'bg-emerald-500/10 backdrop-blur-sm'}`}>
                    <BotIcon className={`w-5 h-5 ${theme === 'dark' ? 'text-blue-400' : 'text-emerald-600'}`} />
                  </div>
                  <div className={`flex-1 max-w-3xl p-4 rounded-2xl backdrop-blur-xl border shadow-lg
                      ${theme === 'dark'
                      ? 'bg-slate-800/50 border-slate-600/30'
                      : 'bg-white/80 border-gray-300/30'}`}>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${settings.reduceMotion ? 'bg-gray-400' : 'animate-bounce bg-gray-400'}
                          ${theme === 'dark' ? 'bg-gray-300' : 'bg-gray-600'}`} style={{ animationDelay: '0ms' }} />
                      <div className={`w-2 h-2 rounded-full ${settings.reduceMotion ? 'bg-gray-400' : 'animate-bounce bg-gray-400'}
                          ${theme === 'dark' ? 'bg-gray-300' : 'bg-gray-600'}`} style={{ animationDelay: '150ms' }} />
                      <div className={`w-2 h-2 rounded-full ${settings.reduceMotion ? 'bg-gray-400' : 'animate-bounce bg-gray-400'}
                          ${theme === 'dark' ? 'bg-gray-300' : 'bg-gray-600'}`} style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </main>

        {/* Input Area */}
        <div className="p-6">
          <div className="max-w-4xl mx-auto">
            <form onSubmit={handleSendMessage} className={`flex items-center gap-3 p-3 rounded-2xl backdrop-blur-xl border shadow-lg ${settings.reduceMotion ? '' : 'transition-all duration-200'}
                ${theme === 'dark'
                ? 'bg-slate-800/50 border-slate-600/30'
                : 'bg-white/80 border-gray-300/30'}`}>

              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Ask about The Last of Us Part 2..."
                rows={1}
                className={`flex-1 bg-transparent resize-none outline-none leading-6 py-2
                    ${theme === 'dark' ? 'text-white placeholder:text-gray-400' : 'text-gray-900 placeholder:text-gray-600'}`}
                style={{
                  minHeight: '24px',
                  maxHeight: '120px',
                  fontSize: `${settings.fontSize}px`
                }}
                onInput={(e) => {
                  e.target.style.height = 'auto';
                  e.target.style.height = e.target.scrollHeight + 'px';
                }}
                aria-label="Message input"
              />

              <button
                type="submit"
                disabled={!newMessage.trim() || isApiLoading}
                className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${settings.reduceMotion ? '' : 'transition-all duration-200'} focus:outline-none focus:ring-2 focus:ring-offset-2
                    ${!newMessage.trim() || isApiLoading
                    ? theme === 'dark'
                      ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : theme === 'dark'
                      ? `bg-emerald-600 hover:bg-emerald-700 text-white ${settings.reduceMotion ? '' : 'transform hover:scale-105'} focus:ring-emerald-500`
                      : `bg-blue-600 hover:bg-blue-700 text-white ${settings.reduceMotion ? '' : 'transform hover:scale-105'} focus:ring-blue-500`
                  }`}
                aria-label="Send message"
              >
                <SendIcon />
              </button>
            </form>
          </div>
        </div>
      </>
    );
  };

  return (
    <div className={`flex min-h-screen ${settings.reduceMotion ? '' : 'transition-colors duration-300'}
        ${theme === 'dark'
        ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900'
        : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-emerald-50'}`}>

      {/* Sidebar */}
      <div className={`
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          fixed inset-y-0 left-0 z-50 w-80 ${settings.reduceMotion ? '' : 'transition-transform duration-300 ease-in-out'}
          lg:relative lg:translate-x-0 lg:w-80
          ${theme === 'dark'
          ? 'bg-slate-900/95 backdrop-blur-xl border-r border-slate-700/50'
          : 'bg-white/95 backdrop-blur-xl border-r border-gray-300/50'}
        `}>

        {/* Sidebar Header */}
        <div className={`flex items-center justify-between p-4 border-b backdrop-blur-sm
            ${theme === 'dark' ? 'border-slate-700/50' : 'border-gray-300/50'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center backdrop-blur-sm
                ${theme === 'dark' ? 'bg-blue-500/20' : 'bg-blue-600/10'}`}>
              <span className={`font-bold text-sm ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>TLoU</span>
            </div>
            <h1 className={`font-bold text-lg
                ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              The Last of Us
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg ${settings.reduceMotion ? '' : 'transition-colors'} focus:outline-none focus:ring-2 focus:ring-offset-2
                  ${theme === 'dark'
                  ? 'hover:bg-slate-700/40 text-yellow-400 focus:ring-yellow-500'
                  : 'hover:bg-gray-200/60 text-gray-700 focus:ring-gray-400'}`}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            </button>

            <button
              onClick={handleNewChat}
              className={`p-2 rounded-lg ${settings.reduceMotion ? '' : 'transition-colors'} focus:outline-none focus:ring-2 focus:ring-offset-2
                  ${theme === 'dark'
                  ? 'hover:bg-slate-700/40 text-white focus:ring-slate-500'
                  : 'hover:bg-gray-200/60 text-gray-700 focus:ring-gray-400'}`}
              aria-label="New chat"
            >
              <PlusIcon />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <div className={`p-4 space-y-2 border-b backdrop-blur-sm
            ${theme === 'dark' ? 'border-slate-700/50' : 'border-gray-300/50'}`}>
          <NavItem
            icon={<ChatDotsIcon />}
            label="Chat"
            page="chat"
            onClick={() => {
              setCurrentPage('chat');
              setIsSidebarOpen(false);
            }}
          />
          <NavItem
            icon={<TrophyIcon />}
            label="Trophies"
            page="trophies"
            onClick={() => {
              setCurrentPage('trophies');
              setIsSidebarOpen(false);
            }}
          />
          <NavItem
            icon={<CollectiblesIcon />}
            label="Collectibles"
            page="collectibles"
            onClick={() => {
              setCurrentPage('collectibles');
              setIsSidebarOpen(false);
            }}
          />
        </div>

        {/* Chat List */}
        {currentPage === 'chat' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            <h3 className={`text-sm font-medium mb-3 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Recent Conversations
            </h3>
            {conversations.map((chat) => (
              <ChatItem
                key={chat.id}
                chat={chat}
                onSelect={handleSelectChat}
                onDelete={handleDeleteChat}
                onEdit={handleEditTitle}
              />
            ))}
          </div>
        )}

        {/* Sidebar Footer */}
        <div className={`p-4 border-t backdrop-blur-sm
            ${theme === 'dark' ? 'border-slate-700/50' : 'border-gray-300/50'}`}>
          <NavItem
            icon={<GearIcon />}
            label="Settings"
            page="settings"
            onClick={() => {
              setCurrentPage('settings');
              setIsSidebarOpen(false);
            }}
          />
          <div className={`text-xs text-center mt-4
              ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
            The Last of Us Part 2 Assistant
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">

        {/* Header */}
        <header className={`flex items-center justify-between p-4 border-b backdrop-blur-xl
            ${theme === 'dark'
            ? 'bg-slate-800/40 border-slate-700/50'
            : 'bg-white/60 border-gray-300/50'}`}>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={`lg:hidden p-2 rounded-lg ${settings.reduceMotion ? '' : 'transition-colors'} focus:outline-none focus:ring-2 focus:ring-offset-2
                  ${theme === 'dark'
                  ? 'hover:bg-slate-700/40 text-white focus:ring-slate-500'
                  : 'hover:bg-gray-200/60 text-gray-700 focus:ring-gray-400'}`}
              aria-label="Toggle sidebar"
            >
              <BarsIcon />
            </button>

            <h2 className={`font-semibold text-lg
                ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {currentPage === 'chat'
                ? currentChat?.name || 'Loading...'
                : currentPage === 'trophies'
                  ? 'Trophy Tracking'
                  : currentPage === 'collectibles'
                    ? 'Collectibles Tracking'
                    : 'Settings'
              }
            </h2>
          </div>
        </header>

        {renderMainContent()}
      </div>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Custom Styles */}
      <style jsx>{`
          @keyframes pulse-glow {
            0%, 100% { 
              box-shadow: 0 0 5px ${theme === 'dark' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(37, 99, 235, 0.3)'};
            }
            50% { 
              box-shadow: 0 0 20px ${theme === 'dark' ? 'rgba(16, 185, 129, 0.5)' : 'rgba(37, 99, 235, 0.5)'}, 
                          0 0 30px ${theme === 'dark' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(37, 99, 235, 0.3)'};
            }
          }
          
          .animate-pulse-glow {
            animation: ${settings.reduceMotion ? 'none' : 'pulse-glow 4s ease-in-out infinite'};
          }
        `}</style>
    </div>
  );
};


const ChatDotsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
    <path d="M5 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0m4 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0m4 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0" />
  </svg>
);

const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
    <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4" />
  </svg>
);

const GearIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
    <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492M5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0" />
    <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.668-.915-3.413.9-2.5 2.565l.16.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.915 1.668.9 3.413 2.565 2.5l.292-.16a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.668.915 3.413-.9 2.5-2.565l-.16-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.915-1.668-.9-3.413-2.565-2.5l-.292.16a.873.873 0 0 1-1.255-.52z" />
  </svg>
);

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
    <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z" />
    <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1z" />
  </svg>
);

const PencilIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
    <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293z" />
  </svg>
);

const UserCircleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
    <path d="M11 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0" />
    <path fillRule="evenodd" d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8m8-7a7 7 0 0 0-5.468 11.37C3.242 11.226 4.805 10 8 10s4.757 1.225 5.468 2.37A7 7 0 0 0 8 1" />
  </svg>
);

const BotIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
    <path d="M6 12.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5M3 8.062C3 6.76 4.235 5.765 5.53 5.886a26.6 26.6 0 0 0 4.94 0C11.765 5.765 13 6.76 13 8.062v1.157a.93.93 0 0 1-.765.935c-.845.147-2.34.346-4.235.346s-3.39-.2-4.235-.346A.93.93 0 0 1 3 9.219zm4.542-.827a.25.25 0 0 0-.217.068l-.92.9a25 25 0 0 1-1.871-.183.25.25 0 0 0-.068.495c.55.076 1.232.149 2.02.193a.25.25 0 0 0 .189-.071l.754-.736.847 1.71a.25.25 0 0 0 .404.062l.932-.97a25 25 0 0 0 1.922-.188.25.25 0 0 0-.068-.495c-.538.074-1.207.145-1.98.189a.25.25 0 0 0-.189.071l-.754.736-.847-1.71a.25.25 0 0 0-.404-.062M8 1a2.5 2.5 0 0 1 2.5 2.5V4h-5v-.5A2.5 2.5 0 0 1 8 1" />
  </svg>
);

const BarsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
    <path fillRule="evenodd" d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5" />
  </svg>
);

const SendIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
    <path d="M15.854.146a.5.5 0 0 1 .11.54l-5.819 14.547a.5.5 0 0 1-.921-.08L6.22 11.748l-3.334-4.058a.5.5 0 0 1-.08-.921L17.353.146a.5.5 0 0 1 .501 0" />
  </svg>
);

const SunIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
    <path d="M8 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6m0 1a4 4 0 1 0 0-8 4 4 0 0 0 0 8M8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0m0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13m8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5M3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8" />
  </svg>
);

const MoonIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
    <path d="M6 .278a.768.768 0 0 1 .08.858 7.2 7.2 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277q.792-.001 1.533-.16a.79.79 0 0 1 .81.316.73.73 0 0 1-.031.893A8.35 8.35 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.75.75 0 0 1 6 .278" />
  </svg>
);

const TrophyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
    <path d="M2.5.5A.5.5 0 0 1 3 0h10a.5.5 0 0 1 .5.5q0 .807-.034 1.536a3 3 0 1 1-1.133 5.89c-.79 1.865-1.878 2.777-2.833 3.011v2.173l1.425.356c.194.048.377.135.537.255L13.3 15.1a.5.5 0 0 1-.3.9H3a.5.5 0 0 1-.3-.9l1.838-1.379c.16-.12.343-.207.537-.255L6.5 13.11v-2.173c-.955-.234-2.043-1.146-2.833-3.012a3 3 0 1 1-1.132-5.89A33 33 0 0 1 2.5.5m.099 2.54a2 2 0 0 0 .72 3.935c-.333-1.05-.588-2.346-.72-3.935m10.083 3.935a2 2 0 0 0 .72-3.935c-.133 1.59-.388 2.885-.72 3.935" />
  </svg>
);

const CollectiblesIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
    <path d="M1 2.828c.885-.37 2.154-.769 3.388-.893 1.33-.134 2.458.063 3.112.752v9.746c-.935-.53-2.12-.603-3.213-.493-1.18.12-2.37.461-3.287.811zm7.5-.141c.654-.689 1.782-.886 3.112-.752 1.234.124 2.503.523 3.388.893v9.923c-.918-.35-2.107-.692-3.287-.81-1.094-.111-2.278-.039-3.213.492zM8 1.783C7.015.936 5.587.81 4.287.94c-1.514.153-3.042.672-3.994 1.105A.5.5 0 0 0 0 2.5v11a.5.5 0 0 0 .707.455c.882-.4 2.303-.881 3.68-1.02 1.409-.142 2.59.087 3.223.877a.5.5 0 0 0 .78 0c.633-.79 1.814-1.019 3.222-.877 1.378.139 2.8.62 3.681 1.02A.5.5 0 0 0 16 13.5v-11a.5.5 0 0 0-.293-.455c-.952-.433-2.48-.952-3.994-1.105C10.413.809 8.985.936 8 1.783" />
  </svg>
);

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
    <path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425z" />
  </svg>
);

const AccessibilityIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
    <path d="M8 4a.5.5 0 0 1 .5.5v1.5H10a.5.5 0 0 1 0 1H8.5V8.5a.5.5 0 0 1-1 0V7H6a.5.5 0 0 1 0-1h1.5V4.5A.5.5 0 0 1 8 4zM8 1a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 9.5a3 3 0 0 1 7 0v.5a.5.5 0 0 1-1 0v-.5a2 2 0 1 0-4 0v.5a.5.5 0 0 1-1 0v-.5z" />
  </svg>
);

const PaletteIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
    <path d="M8 5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm4 3a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM5.5 7a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm.5 6a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z" />
    <path d="M16 8c0 3.15-1.866 2.585-3.567 2.07C11.42 9.763 10.465 9.473 10 10c-.603.683-.475 1.819-.351 2.92C9.826 14.495 9.996 16 8 16a8 8 0 1 1 8-8z" />
  </svg>
);

const TypeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
    <path d="M2.244 13.081a1 1 0 0 0 .746-.417l2.298-3.622C5.968 8.343 6.75 8 7.5 8h1c.75 0 1.532.343 2.212 1.042l2.298 3.622a1 1 0 0 0 .746.417h.238a.5.5 0 0 1 .5.5v.5a.5.5 0 0 1-.5.5h-13a.5.5 0 0 1-.5-.5v-.5a.5.5 0 0 1 .5-.5h.238zM1.007 4.406l.707-.707L7 9.985V13.5a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5V9.985l5.286-6.286.707.707-2.4 2.4v1.34c0 .308-.25.558-.558.558H4.965a.558.558 0 0 1-.558-.558V6.106l-2.4-2.4z" />
  </svg>
);


const CircularProgress = ({ percentage, size = 200, strokeWidth = 8, color, children, reduceMotion }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = `${circumference} ${circumference}`;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex items-center justify-center" style={{ width: size, height: size }}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          className="transform -rotate-90 absolute inset-0"
          width={size}
          height={size}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            className="text-gray-300 opacity-30"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className={reduceMotion ? "" : "transition-all duration-1000 ease-out"}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      </div>
    </div>
  );
};


const SettingsPage = ({ theme, settings, updateSettings }) => {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8" style={{ fontSize: `${settings.fontSize}px` }}>
      <h2 className={`text-3xl font-bold mb-8
        ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
        Settings
      </h2>

      {/* Appearance Section */}
      <div className={`p-6 rounded-2xl backdrop-blur-xl border shadow-lg
        ${theme === 'dark'
          ? 'bg-slate-800/30 border-slate-600/30'
          : 'bg-white/60 border-gray-300/30'}`}>
        <div className="flex items-center gap-3 mb-6">
          <PaletteIcon className={theme === 'dark' ? 'text-white' : 'text-gray-900'} />
          <h3 className={`text-xl font-semibold
            ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Appearance
          </h3>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className={`text-lg font-medium block
                ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Theme
              </label>
              <p className={`text-sm
                ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                Choose between light and dark mode
              </p>
            </div>
            <div className="flex items-center gap-3">
              <SunIcon className={theme === 'light' ? 'text-yellow-500' : 'text-gray-400'} />
              <button
                onClick={() => updateSettings('theme', theme === 'dark' ? 'light' : 'dark')}
                className={`relative w-14 h-8 rounded-full ${settings.reduceMotion ? '' : 'transition-colors duration-300'} focus:outline-none focus:ring-2 focus:ring-offset-2 
                  ${theme === 'dark'
                    ? 'bg-blue-600 focus:ring-blue-500'
                    : 'bg-gray-300 focus:ring-gray-500'}`}
                aria-label="Toggle theme"
              >
                <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full ${settings.reduceMotion ? '' : 'transition-transform duration-300 transform'}
                  ${theme === 'dark' ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
              <MoonIcon className={theme === 'dark' ? 'text-blue-400' : 'text-gray-400'} />
            </div>
          </div>
        </div>
      </div>

      {/* Typography Section */}
      <div className={`p-6 rounded-2xl backdrop-blur-xl border shadow-lg
        ${theme === 'dark'
          ? 'bg-slate-800/30 border-slate-600/30'
          : 'bg-white/60 border-gray-300/30'}`}>
        <div className="flex items-center gap-3 mb-6">
          <TypeIcon className={theme === 'dark' ? 'text-white' : 'text-gray-900'} />
          <h3 className={`text-xl font-semibold
            ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Typography
          </h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className={`text-lg font-medium block mb-2
              ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Font Size: {settings.fontSize}px
            </label>
            <input
              type="range"
              min="12"
              max="20"
              value={settings.fontSize}
              onChange={(e) => updateSettings('fontSize', parseInt(e.target.value))}
              className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Font size"
            />
            <div className="flex justify-between text-sm mt-1">
              <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>12px</span>
              <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>20px</span>
            </div>
            <div className={`mt-4 p-3 rounded-lg border ${theme === 'dark' ? 'border-slate-600 bg-slate-800/50' : 'border-gray-300 bg-gray-100'}`}>
              <p className={theme === 'dark' ? 'text-white' : 'text-gray-900'} style={{ fontSize: `${settings.fontSize}px` }}>
                This is a preview of how text will appear with your selected font size in The Last of Us Part 2 Assistant.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Accessibility Section */}
      <div className={`p-6 rounded-2xl backdrop-blur-xl border shadow-lg
        ${theme === 'dark'
          ? 'bg-slate-800/30 border-slate-600/30'
          : 'bg-white/60 border-gray-300/30'}`}>
        <div className="flex items-center gap-3 mb-6">
          <AccessibilityIcon className={theme === 'dark' ? 'text-white' : 'text-gray-900'} />
          <h3 className={`text-xl font-semibold
            ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Accessibility
          </h3>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className={`text-lg font-medium block
                ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Reduce Motion
              </label>
              <p className={`text-sm
                ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                Minimize animations and transitions throughout the app
              </p>
            </div>
            <button
              onClick={() => updateSettings('reduceMotion', !settings.reduceMotion)}
              className={`relative w-14 h-8 rounded-full ${settings.reduceMotion ? '' : 'transition-colors duration-300'} focus:outline-none focus:ring-2 focus:ring-offset-2 
                ${settings.reduceMotion
                  ? 'bg-blue-600 focus:ring-blue-500'
                  : 'bg-gray-300 focus:ring-gray-500'}`}
              aria-label="Toggle reduce motion"
            >
              <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full ${settings.reduceMotion ? '' : 'transition-transform duration-300 transform'}
                ${settings.reduceMotion ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


const TrophyPage = ({ theme, settings }) => {

  const [trophies, setTrophies] = useState(() => {
    try {
      const saved = localStorage.getItem('tlou_trophies');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('Error loading trophies from localStorage:', error);
    }
    
    
    return [
      { id: 1, name: "Every Last One of Them", description: "Collect all trophies", unlocked: false, rarity: "Ultra Rare" },
      { id: 2, name: "What I Had to Do", description: "Complete the story", unlocked: false, rarity: "Very Rare" },
      { id: 3, name: "Survival Expert", description: "Learn all player upgrades", unlocked: false, rarity: "Very Rare" },
      { id: 4, name: "Arms Master", description: "Fully upgrade all weapons", unlocked: false, rarity: "Very Rare" },
      { id: 5, name: "Archivist", description: "Find all artifacts and journal entries", unlocked: false, rarity: "Very Rare" },
      { id: 6, name: "Master Set", description: "Find all trading cards", unlocked: false, rarity: "Very Rare" },
      { id: 7, name: "Numismatist", description: "Find all coins", unlocked: false, rarity: "Very Rare" },
      { id: 8, name: "Prepared For the Worst", description: "Find all workbenches", unlocked: false, rarity: "Very Rare" },
      { id: 9, name: "Mechanist", description: "Fully upgrade a weapon", unlocked: false, rarity: "Rare" },
      { id: 10, name: "Specialist", description: "Learn all player upgrades in one branch", unlocked: false, rarity: "Rare" },
      { id: 11, name: "Safecracker", description: "Unlock every safe", unlocked: false, rarity: "Rare" },
      { id: 12, name: "Sightseer", description: "Visit every location in downtown Seattle", unlocked: false, rarity: "Rare" },
      { id: 13, name: "Journeyman", description: "Find all training manuals", unlocked: false, rarity: "Rare" },
      { id: 14, name: "Survival Training", description: "Learn 25 player upgrades", unlocked: false, rarity: "Rare" },
      { id: 15, name: "High Caliber", description: "Find all weapons", unlocked: false, rarity: "Rare" },
      { id: 16, name: "In the Field", description: "Find 12 workbenches", unlocked: false, rarity: "Rare" },
      { id: 17, name: "Tools of the Trade", description: "Craft every item", unlocked: false, rarity: "Common" },
      { id: 18, name: "Tinkerer", description: "Upgrade a weapon", unlocked: false, rarity: "Common" },
      { id: 19, name: "Apprentice", description: "Learn a player upgrade", unlocked: false, rarity: "Common" },
      { id: 20, name: "Starter Set", description: "Find 5 trading cards", unlocked: false, rarity: "Common" },
      { id: 21, name: "Mint Condition", description: "Find 5 coins", unlocked: false, rarity: "Common" },
      { id: 22, name: "Relic of the Sages", description: "Find the Strange Artifact", unlocked: false, rarity: "Common" },
      { id: 23, name: "So Great and Small", description: "Find the Engraved Ring", unlocked: false, rarity: "Common" },
      { id: 24, name: "Looks Good On You", description: "Put a hat on your companion", unlocked: false, rarity: "Common" },
      { id: 25, name: "Sharpshooter", description: "Win the marksmanship competition", unlocked: false, rarity: "Common" },
      { id: 26, name: "Put My Name Up", description: "Earn the highscore in the archery game", unlocked: false, rarity: "Common" },
    ];
  });

  
  React.useEffect(() => {
    localStorage.setItem('tlou_trophies', JSON.stringify(trophies));
  }, [trophies]);

  const toggleTrophy = (id) => {
    setTrophies(prev => prev.map(trophy =>
      trophy.id === id ? { ...trophy, unlocked: !trophy.unlocked } : trophy
    ));
  };

  const unlockedCount = trophies.filter(trophy => trophy.unlocked).length;
  const completionPercentage = Math.round((unlockedCount / trophies.length) * 100);

  const getColors = () => ({
    background: theme === 'dark' ? 'bg-slate-800/40' : 'bg-white/70',
    border: theme === 'dark' ? 'border-slate-600/30' : 'border-gray-300/30',
    text: theme === 'dark' ? 'text-white' : 'text-gray-900',
    textSecondary: theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
  });

  const colors = getColors();

  return (
    <div className="p-6" style={{ fontSize: `${settings.fontSize}px` }}>
      <div className="flex flex-col lg:flex-row gap-8 max-w-7xl mx-auto">
        {/* Circular Progress Section */}
        <div className={`flex-shrink-0 p-8 rounded-2xl backdrop-blur-xl border shadow-lg text-center
          ${colors.background} ${colors.border}`}>
          <h2 className={`text-2xl font-bold mb-6 ${colors.text}`}>
            Trophy Progress
          </h2>

          <CircularProgress
            percentage={completionPercentage}
            size={240}
            strokeWidth={12}
            color={theme === 'dark' ? '#3b82f6' : '#059669'}
            reduceMotion={settings.reduceMotion}
          >
            <div className="text-center">
              <div className={`text-4xl font-bold mb-2 ${colors.text}`}>
                {completionPercentage}%
              </div>
              <div className={`text-sm font-medium ${colors.textSecondary}`}>
                {unlockedCount} of {trophies.length}
              </div>
              <div className={`text-xs ${colors.textSecondary}`}>
                Trophies Unlocked
              </div>
            </div>
          </CircularProgress>
        </div>

        {/* Trophy List Section */}
        <div className="flex-1 space-y-3">
          <h3 className={`text-xl font-semibold mb-4 ${colors.text}`}>
            Trophy Collection
          </h3>

          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {trophies.map((trophy) => (
              <button
                key={trophy.id}
                onClick={() => toggleTrophy(trophy.id)}
                className={`w-full p-4 rounded-xl backdrop-blur-xl border ${settings.reduceMotion ? '' : 'transition-all duration-200'} focus:outline-none focus:ring-2 focus:ring-offset-2
                  ${trophy.unlocked
                    ? theme === 'dark'
                      ? 'bg-blue-500/20 border-blue-400/40 hover:bg-blue-500/25 focus:ring-blue-500'
                      : 'bg-emerald-500/20 border-emerald-400/40 hover:bg-emerald-500/25 focus:ring-emerald-500'
                    : theme === 'dark'
                      ? 'bg-slate-800/40 border-slate-600/30 hover:bg-slate-800/50 focus:ring-slate-500'
                      : 'bg-white/50 border-gray-300/40 hover:bg-white/70 focus:ring-gray-400'
                  }`}>
                <div className="flex items-center justify-between text-left">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${settings.reduceMotion ? '' : 'transition-all'}
                      ${trophy.unlocked
                        ? theme === 'dark' ? 'bg-blue-500/30 text-blue-400' : 'bg-emerald-500/30 text-emerald-600'
                        : theme === 'dark' ? 'bg-slate-700 text-slate-500' : 'bg-gray-200 text-gray-500'
                      }`}>
                      {trophy.unlocked ? <CheckIcon /> : <TrophyIcon />}
                    </div>
                    <div>
                      <h3 className={`font-semibold text-lg ${colors.text}`}>
                        {trophy.name}
                      </h3>
                      <p className={`text-sm ${colors.textSecondary}`}>
                        {trophy.description}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`px-3 py-1 rounded-full text-xs font-medium mb-1
                      ${trophy.rarity === 'Common'
                        ? 'bg-gray-500/20 text-gray-600'
                        : trophy.rarity === 'Uncommon'
                          ? 'bg-green-500/20 text-green-600'
                          : trophy.rarity === 'Rare'
                            ? 'bg-blue-500/20 text-blue-600'
                            : trophy.rarity === 'Very Rare'
                              ? 'bg-purple-500/20 text-purple-600'
                              : 'bg-yellow-500/20 text-yellow-600'
                      }`}>
                      {trophy.rarity}
                    </div>
                    <div className={`text-xs font-medium
                      ${trophy.unlocked
                        ? theme === 'dark' ? 'text-blue-400' : 'text-emerald-600'
                        : theme === 'dark' ? 'text-slate-500' : 'text-gray-500'
                      }`}>
                      {trophy.unlocked ? 'Unlocked' : 'Locked'}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};


const CollectiblesPage = ({ theme, settings }) => {

  const [collectibles, setCollectibles] = useState(() => {
    try {
      const saved = localStorage.getItem('tlou_collectibles');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('Error loading collectibles from localStorage:', error);
    }


    return [
      { id: 1, category: "Artifact", name: "Volunteer Request", found: false },
      { id: 2, category: "Artifact", name: "Letter from Seth", found: false },
      { id: 3, category: "Artifact", name: "A Note to Santa", found: false },
      { id: 4, category: "Artifact", name: "Supermarket Apology", found: false },
      { id: 5, category: "Artifact", name: "Good Boy Combo", found: false },
      { id: 6, category: "Artifact", name: "Eugene's Firefly Pendant", found: false },
      { id: 7, category: "Artifact", name: "Photo of Eugene and Tommy", found: false },
      { id: 8, category: "Artifact", name: "Eugene's Ultimatum", found: false },
      { id: 9, category: "Artifact", name: "Joel's Watch", found: false },
      { id: 10, category: "Artifact", name: "Map of Seattle", found: false },
      { id: 128, category: "Trading Card", name: "The Keene Twins", found: false },
      { id: 129, category: "Trading Card", name: "Tesseracter", found: false },
      { id: 130, category: "Trading Card", name: "Laurent Foucault, CEO Spark", found: false },
      { id: 131, category: "Trading Card", name: "Motivator", found: false },
      { id: 132, category: "Trading Card", name: "The Starfire Kids", found: false },
      { id: 175, category: "Coin", name: "Virginia", found: false },
      { id: 176, category: "Coin", name: "Alaska", found: false },
      { id: 177, category: "Coin", name: "Maine", found: false },
      { id: 178, category: "Coin", name: "New Jersey", found: false },
      { id: 179, category: "Coin", name: "Vermont", found: false },
      { id: 207, category: "Journal Entry", name: "Owl Mug", found: false },
      { id: 208, category: "Journal Entry", name: "Joel's Guitar", found: false },
      { id: 209, category: "Journal Entry", name: "WLF Gate", found: false },
      { id: 210, category: "Journal Entry", name: "Street View", found: false },
      { id: 211, category: "Journal Entry", name: "Hebrew Calendar", found: false },
      { id: 227, category: "Training Manual", name: "Crafting", found: false },
      { id: 228, category: "Training Manual", name: "Stealth", found: false },
      { id: 229, category: "Training Manual", name: "Precision", found: false },
      { id: 230, category: "Training Manual", name: "Explosives", found: false },
      { id: 231, category: "Training Manual", name: "Covert Ops", found: false },
    ];
  });


  React.useEffect(() => {
    localStorage.setItem('tlou_collectibles', JSON.stringify(collectibles));
  }, [collectibles]);

  const toggleCollectible = (id) => {
    setCollectibles(prev => prev.map(item =>
      item.id === id ? { ...item, found: !item.found } : item
    ));
  };

  const categories = [...new Set(collectibles.map(item => item.category))];
  const categoryStats = categories.map(cat => {
    const items = collectibles.filter(item => item.category === cat);
    const found = items.filter(item => item.found).length;
    return {
      category: cat,
      found,
      total: items.length,
      percentage: Math.round((found / items.length) * 100)
    };
  });

  const totalFound = collectibles.filter(item => item.found).length;
  const totalItems = collectibles.length;
  const overallPercentage = Math.round((totalFound / totalItems) * 100);

  const getColors = () => ({
    background: theme === 'dark' ? 'bg-slate-800/40' : 'bg-white/70',
    border: theme === 'dark' ? 'border-slate-600/30' : 'border-gray-300/30',
    text: theme === 'dark' ? 'text-white' : 'text-gray-900',
    textSecondary: theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
  });

  const colors = getColors();

  return (
    <div className="p-6" style={{ fontSize: `${settings.fontSize}px` }}>
      <div className="flex flex-col lg:flex-row gap-8 max-w-7xl mx-auto">
        {/* Circular Progress Section */}
        <div className={`flex-shrink-0 p-8 rounded-2xl backdrop-blur-xl border shadow-lg text-center
          ${colors.background} ${colors.border}`}>
          <h2 className={`text-2xl font-bold mb-6 ${colors.text}`}>
            Collectibles Progress
          </h2>

          <CircularProgress
            percentage={overallPercentage}
            size={240}
            strokeWidth={12}
            color={theme === 'dark' ? '#10b981' : '#3b82f6'}
            reduceMotion={settings.reduceMotion}
          >
            <div className="text-center">
              <div className={`text-4xl font-bold mb-2 ${colors.text}`}>
                {overallPercentage}%
              </div>
              <div className={`text-sm font-medium ${colors.textSecondary}`}>
                {totalFound} of {totalItems}
              </div>
              <div className={`text-xs ${colors.textSecondary}`}>
                Items Found
              </div>
            </div>
          </CircularProgress>

          {/* Category Breakdown */}
          <div className="mt-8 space-y-3">
            {categoryStats.map((cat, index) => (
              <div key={index} className={`p-3 rounded-lg backdrop-blur-sm
                ${theme === 'dark' ? 'bg-slate-700/30' : 'bg-gray-100/60'}`}>
                <div className="flex justify-between items-center mb-1">
                  <span className={`text-sm font-medium ${colors.text}`}>
                    {cat.category}
                  </span>
                  <span className={`text-xs ${colors.textSecondary}`}>
                    {cat.found}/{cat.total}
                  </span>
                </div>
                <div className={`w-full bg-gray-300/30 rounded-full h-2`}>
                  <div
                    className={`h-2 rounded-full ${settings.reduceMotion ? '' : 'transition-all duration-500'}
                      ${theme === 'dark' ? 'bg-emerald-400' : 'bg-blue-500'}`}
                    style={{ width: `${cat.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Collectibles List Section */}
        <div className="flex-1 space-y-3">
          <h3 className={`text-xl font-semibold mb-4 ${colors.text}`}>
            Collectibles Checklist
          </h3>

          <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2">
            {categories.map(category => (
              <div key={category} className="space-y-2">
                <h4 className={`text-lg font-medium mb-3 ${colors.text} sticky top-0 py-2 z-10
                  ${theme === 'dark' ? 'bg-slate-900/90' : 'bg-blue-50/90'} backdrop-blur-sm rounded-lg px-2`}>
                  {category}
                </h4>
                <div className="space-y-2">
                  {collectibles
                    .filter(item => item.category === category)
                    .map((item) => (
                      <button
                        key={item.id}
                        onClick={() => toggleCollectible(item.id)}
                        className={`w-full p-4 rounded-xl backdrop-blur-xl border ${settings.reduceMotion ? '' : 'transition-all duration-200'} focus:outline-none focus:ring-2 focus:ring-offset-2
                          ${item.found
                            ? theme === 'dark'
                              ? 'bg-emerald-500/20 border-emerald-400/40 hover:bg-emerald-500/25 focus:ring-emerald-500'
                              : 'bg-blue-500/20 border-blue-400/40 hover:bg-blue-500/25 focus:ring-blue-500'
                            : theme === 'dark'
                              ? 'bg-slate-800/40 border-slate-600/30 hover:bg-slate-800/50 focus:ring-slate-500'
                              : 'bg-white/50 border-gray-300/40 hover:bg-white/70 focus:ring-gray-400'
                          }`}>
                        <div className="flex items-center gap-4 text-left">
                          <div className={`w-6 h-6 rounded border-2 flex items-center justify-center ${settings.reduceMotion ? '' : 'transition-all'}
                            ${item.found
                              ? theme === 'dark'
                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                : 'bg-blue-500 border-blue-500 text-white'
                              : theme === 'dark'
                                ? 'border-slate-600'
                                : 'border-gray-400'
                            }`}>
                            {item.found && <CheckIcon className="w-4 h-4" />}
                          </div>
                          <span className={`font-medium ${colors.text}`}>
                            {item.name}
                          </span>
                        </div>
                      </button>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App; 