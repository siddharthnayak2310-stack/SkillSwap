import Navbar from '../components/Navbar';
import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api, { formatApiError, API } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { Send, ArrowLeft, Attachment, EmojiTalkingHappy, Xmark, Download, Page } from 'iconoir-react';
import EmojiPicker from 'emoji-picker-react';

const isImageType = (t) => (t || '').startsWith('image/');

function Attachment_({ msg }) {
  if (!msg.attachment_path) return null;
  const url = `${API}/files/${msg.attachment_path}`;
  if (isImageType(msg.attachment_type)) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="block mt-1">
        <img
          src={url}
          alt={msg.attachment_name || 'image'}
          className="max-w-[280px] max-h-[280px] brutal-border bg-white"
          data-testid="msg-image"
        />
      </a>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="mt-1 flex items-center gap-2 px-3 py-2 brutal-border bg-white hover:bg-brand-cream transition-colors max-w-[280px]"
      data-testid="msg-file"
    >
      <Page className="w-5 h-5 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold truncate">{msg.attachment_name || 'File'}</div>
        <div className="text-xs text-neutral-500">Click to download</div>
      </div>
      <Download className="w-4 h-4 shrink-0" />
    </a>
  );
}

export default function Chat() {
  const { exchangeId } = useParams();
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [exchange, setExchange] = useState(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [pendingFile, setPendingFile] = useState(null); // {path, name, content_type}
  const fileInputRef = useRef(null);
  const endRef = useRef(null);
  const pickerRef = useRef(null);

  const load = async () => {
    try {
      const [msgs, exs] = await Promise.all([
        api.get(`/messages/${exchangeId}`),
        api.get('/exchanges'),
      ]);
      setMessages(msgs.data);
      setExchange(exs.data.find((e) => e.id === exchangeId));
    } catch (e) {
      // ignore transient errors
    }
  };

  useEffect(() => { load(); }, [exchangeId]);
  useEffect(() => {
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [exchangeId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Close emoji on outside click
  useEffect(() => {
    if (!showEmoji) return;
    const onClick = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) setShowEmoji(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [showEmoji]);

  const onFilePick = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) {
      toast.error('File too large (max 10MB)');
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', f);
      const { data } = await api.post(`/upload/chat/${exchangeId}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPendingFile({ path: data.path, name: data.name, content_type: data.content_type });
      toast.success('File attached. Add a note or hit send.');
    } catch (err) {
      toast.error(formatApiError(err));
    }
    setUploading(false);
  };

  const send = async () => {
    if (!text.trim() && !pendingFile) return;
    setBusy(true);
    try {
      const payload = {
        exchange_id: exchangeId,
        text: text.trim(),
      };
      if (pendingFile) {
        payload.attachment_path = pendingFile.path;
        payload.attachment_name = pendingFile.name;
        payload.attachment_type = pendingFile.content_type;
      }
      await api.post('/messages', payload);
      setText('');
      setPendingFile(null);
      setShowEmoji(false);
      load();
    } catch (e) {
      toast.error(formatApiError(e));
    }
    setBusy(false);
  };

  const onEmojiClick = (data) => {
    setText((t) => t + data.emoji);
  };

  const other = exchange
    ? exchange.from_user_id === user.id
      ? { name: exchange.to_user_name, id: exchange.to_user_id }
      : { name: exchange.from_user_name, id: exchange.from_user_id }
    : null;

  return (
    <div className="min-h-screen bg-brand-cream flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-8 py-6 flex flex-col">
        <div className="flex items-center gap-3 mb-4">
          <Link to="/requests" className="p-2 brutal-border bg-white hover:bg-brand-yellow transition-colors" data-testid="chat-back">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1 brutal-border bg-white p-3 flex items-center gap-3">
            {other && (
              <>
                <div className="w-10 h-10 brutal-border bg-brand-yellow flex items-center justify-center font-display font-black">
                  {other.name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <Link to={`/profile/${other.id}`} className="font-display font-black hover:underline" data-testid="chat-other-name">
                    {other.name}
                  </Link>
                  <div className="text-xs text-neutral-500">Exchange chat</div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex-1 brutal-border bg-white p-4 overflow-y-auto min-h-[400px]" data-testid="chat-messages">
          {messages.length === 0 && (
            <div className="text-center text-neutral-500 mt-20">No messages yet. Say hi 👋</div>
          )}
          <div className="space-y-3">
            {messages.map((m) => {
              const mine = m.from_user_id === user.id;
              return (
                <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`} data-testid={`msg-${m.id}`}>
                  <div className={`max-w-[75%] px-4 py-2 brutal-border ${mine ? 'bg-brand-yellow' : 'bg-brand-mint'}`}>
                    {!mine && <div className="text-xs font-bold uppercase tracking-wider mb-1">{m.from_user_name}</div>}
                    {m.text && <div className="text-sm whitespace-pre-wrap break-words">{m.text}</div>}
                    <Attachment_ msg={m} />
                    <div className="text-[10px] text-neutral-600 mt-1">
                      {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={endRef} />
          </div>
        </div>

        {pendingFile && (
          <div className="mt-3 flex items-center gap-3 p-3 brutal-border bg-brand-mint" data-testid="pending-file">
            <Page className="w-5 h-5 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold truncate">{pendingFile.name}</div>
              <div className="text-xs text-neutral-700">Ready to send</div>
            </div>
            <button onClick={() => setPendingFile(null)} className="p-1 brutal-border bg-white hover:bg-brand-coral transition-colors" data-testid="pending-file-remove" aria-label="Remove attachment">
              <Xmark className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="mt-3 flex gap-2 relative">
          <input
            ref={fileInputRef}
            type="file"
            onChange={onFilePick}
            className="hidden"
            accept="image/*,.pdf,.txt,.md,.csv,.json,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip"
            data-testid="chat-file-input"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-3 py-3 brutal-border bg-white hover:bg-brand-mint transition-colors disabled:opacity-60"
            data-testid="chat-attach"
            aria-label="Attach file"
          >
            <Attachment className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => setShowEmoji((v) => !v)}
            className="px-3 py-3 brutal-border bg-white hover:bg-brand-yellow transition-colors"
            data-testid="chat-emoji-toggle"
            aria-label="Emoji picker"
          >
            <EmojiTalkingHappy className="w-5 h-5" />
          </button>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
            placeholder={uploading ? 'Uploading file…' : pendingFile ? 'Add a note (optional)…' : 'Type a message…'}
            className="flex-1 px-4 py-3 brutal-border bg-white focus:outline-none"
            data-testid="chat-input"
            disabled={uploading}
          />
          <button
            onClick={send}
            disabled={busy || uploading || (!text.trim() && !pendingFile)}
            className="px-5 py-3 brutal-border bg-brand-yellow font-bold brutal-shadow-sm hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-transform disabled:opacity-60"
            data-testid="chat-send"
          >
            <Send className="w-5 h-5" />
          </button>

          {showEmoji && (
            <div ref={pickerRef} className="absolute bottom-16 right-0 z-40 brutal-border brutal-shadow-lg" data-testid="chat-emoji-picker">
              <EmojiPicker
                onEmojiClick={onEmojiClick}
                width={320}
                height={380}
                previewConfig={{ showPreview: false }}
                skinTonesDisabled
                lazyLoadEmojis
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
