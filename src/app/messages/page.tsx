"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Paperclip, Plus, Search, Send, Users, X } from "lucide-react";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Input } from "@/components/Field";

type User = { id: string; name: string; email: string; role: string; profileImageUrl?: string | null };
type Conversation = { id: string; title: string | null; isGroup: boolean; members: { user: User }[]; messages: { body: string; createdAt: string; sender?: User }[] };
type Message = { id: string; body: string; createdAt: string; sender: User; attachments: { id: string; fileName: string; fileUrl: string; fileSize: number }[] };

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [query, setQuery] = useState("");
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [groupOpen, setGroupOpen] = useState(false);
  const [groupTitle, setGroupTitle] = useState("");
  const [groupUsers, setGroupUsers] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  async function loadConversations() {
    try {
      const response = await fetch("/api/messages");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not load conversations");
      setConversations(data.conversations ?? []);
      setCurrentUserId(data.currentUserId ?? "");
      const requestedId = new URLSearchParams(window.location.search).get("conversationId");
      if (!selectedId) {
        const requestedConversation = data.conversations?.find((conversation: Conversation) => conversation.id === requestedId);
        if (requestedConversation) setSelectedId(requestedConversation.id);
        else if (data.conversations?.[0]) setSelectedId(data.conversations[0].id);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load conversations");
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void loadConversations(), 0);
    return () => window.clearTimeout(timer);
    // loadConversations only reads the current session's conversation list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    fetch(`/api/messages?conversationId=${selectedId}`)
      .then(async (response) => ({ response, data: await response.json() }))
      .then(({ response, data }) => {
        if (!active) return;
        if (!response.ok) throw new Error(data.error ?? "Could not load messages");
        setMessages(data.messages ?? []);
        setError(null);
      })
      .catch((loadError) => active && setError(loadError instanceof Error ? loadError.message : "Could not load messages"));
    return () => { active = false; };
  }, [selectedId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      const timer = window.setTimeout(() => setUsers([]), 0);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(() => fetch(`/api/messages?q=${encodeURIComponent(trimmed)}`).then((response) => response.json()).then((data) => setUsers(data.users ?? [])), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  const selected = conversations.find((conversation) => conversation.id === selectedId);
  const selectedName = useMemo(() => selected?.isGroup
    ? selected.title ?? "Group"
    : selected?.members.filter((member) => member.user.id !== currentUserId).map((member) => member.user.name).join(", ") || "Conversation",
  [currentUserId, selected]);

  async function startDirect(user: User) {
    const response = await fetch("/api/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userIds: [user.id] }) });
    const data = await response.json();
    if (response.ok) { await loadConversations(); setSelectedId(data.conversation.id); setQuery(""); }
  }

  function toggleGroupUser(userId: string) {
    setGroupUsers((current) => current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId]);
  }

  async function createGroup(event: React.FormEvent) {
    event.preventDefault();
    if (groupUsers.length === 0 || !groupTitle.trim()) return;
    const response = await fetch("/api/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: groupTitle.trim(), userIds: groupUsers, isGroup: true }) });
    const data = await response.json();
    if (!response.ok) { setError(data.error ?? "Could not create group"); return; }
    setGroupOpen(false); setGroupTitle(""); setGroupUsers([]); await loadConversations(); setSelectedId(data.conversation.id);
  }

  async function sendMessage(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedId || sending || (!body.trim() && !file)) return;
    setSending(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("conversationId", selectedId);
      formData.set("body", body.trim());
      if (file) formData.set("file", file);
      const response = await fetch("/api/messages", { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok || !data.message) throw new Error(data.error ?? "Could not send message");
      setMessages((current) => [...current, data.message]);
      setBody("");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      await loadConversations();
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Could not send message");
    } finally {
      setSending(false);
    }
  }

  return <div className="grid min-h-[calc(100vh-9rem)] grid-cols-1 overflow-hidden rounded-xl border border-zinc-200 bg-white md:grid-cols-[280px_1fr]">
    <aside className="border-b border-zinc-200 bg-zinc-50 md:border-b-0 md:border-r">
      <div className="flex items-center justify-between border-b border-zinc-200 p-3"><h1 className="text-sm font-semibold text-zinc-900">Messages</h1><Button size="sm" onClick={() => setGroupOpen(true)}><Users size={13} /> Group</Button></div>
      <div className="border-b border-zinc-200 p-3"><div className="relative"><Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={groupOpen ? "Find users to add..." : "Find any user..."} className="pl-8" /></div>{users.length > 0 && <div className="mt-2 space-y-1">{users.map((user) => <button key={user.id} onClick={() => groupOpen ? toggleGroupUser(user.id) : startDirect(user)} className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left hover:bg-white"><span><span className="block text-xs font-medium text-zinc-900">{user.name}</span><span className="block text-[10px] uppercase text-zinc-400">{user.role} · {user.email}</span></span>{groupOpen ? <input readOnly type="checkbox" checked={groupUsers.includes(user.id)} aria-label={`Add ${user.name} to group`} /> : <Plus size={13} className="text-[#ef5b3f]" />}</button>)}</div>}</div>
      <div className="max-h-[calc(100vh-17rem)] overflow-y-auto p-2">{conversations.map((conversation) => <button key={conversation.id} onClick={() => setSelectedId(conversation.id)} className={`w-full rounded-md px-3 py-2.5 text-left ${selectedId === conversation.id ? "bg-[#ef5b3f] text-white" : "hover:bg-white"}`}><p className="truncate text-xs font-semibold">{conversation.isGroup ? conversation.title : conversation.members.filter((member) => member.user.id !== currentUserId).map((member) => member.user.name).join(", ") || "Direct message"}</p><p className={`mt-0.5 truncate text-[10px] ${selectedId === conversation.id ? "text-white/70" : "text-zinc-400"}`}>{conversation.messages[0]?.body ?? "No messages yet"}</p></button>)}</div>
    </aside>
    <section className="flex min-h-[500px] flex-col"><div className="border-b border-zinc-200 px-5 py-4"><p className="text-sm font-semibold text-zinc-900">{selectedName}</p><p className="text-xs text-zinc-400">Direct and group messaging</p></div><div className="flex-1 space-y-3 overflow-y-auto p-5">{messages.map((message) => { const mine = message.sender.id === currentUserId; return <div key={message.id} className={`max-w-[80%] rounded-md px-3 py-2 ${mine ? "ml-auto bg-[#17212b] text-white" : "bg-zinc-100"}`}><p className={`text-[11px] font-semibold ${mine ? "text-white/65" : "text-[#ef5b3f]"}`}>{mine ? "You" : message.sender.name}</p>{message.body && <p className={`mt-1 whitespace-pre-wrap text-sm ${mine ? "text-white" : "text-zinc-800"}`}>{message.body}</p>}{(message.attachments ?? []).map((attachment) => <a key={attachment.id} href={attachment.fileUrl} target="_blank" rel="noreferrer" className={`mt-2 flex items-center gap-1 text-xs font-medium hover:underline ${mine ? "text-white" : "text-[#ef5b3f]"}`}><Paperclip size={12} /> {attachment.fileName}</a>)}</div>; })}<div ref={messagesEndRef} />{!selectedId && <p className="m-auto text-sm text-zinc-400">Search for a user or choose a conversation.</p>}</div>{error && <p role="alert" className="px-5 pb-2 text-xs text-rose-600">{error}</p>}{selectedId && <form onSubmit={sendMessage} className="flex items-center gap-2 border-t border-zinc-200 p-3"><input ref={fileRef} type="file" className="hidden" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /><Button type="button" variant="ghost" size="sm" onClick={() => fileRef.current?.click()} aria-label="Attach file"><Paperclip size={16} /></Button><Input value={body} onChange={(event) => setBody(event.target.value)} placeholder={file ? file.name : "Write a message..."} disabled={sending} /><Button type="submit" size="sm" aria-label="Send message" disabled={sending || (!body.trim() && !file)}><Send size={15} /></Button></form>}</section>
    {groupOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><Card className="w-full max-w-md p-5"><div className="mb-4 flex items-center justify-between"><h2 className="font-semibold text-zinc-900">Create group</h2><button onClick={() => setGroupOpen(false)} aria-label="Close"><X size={16} /></button></div><form onSubmit={createGroup} className="space-y-3"><Input value={groupTitle} onChange={(event) => setGroupTitle(event.target.value)} placeholder="Group name" required /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search students or faculty..." /><div className="max-h-52 space-y-1 overflow-y-auto">{users.map((user) => <label key={user.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-zinc-50"><input type="checkbox" checked={groupUsers.includes(user.id)} onChange={() => toggleGroupUser(user.id)} />{user.name}<span className="text-xs text-zinc-400">{user.role} · {user.email}</span></label>)}</div><p className="text-xs text-zinc-500">Selected members: {groupUsers.length}</p><Button type="submit" disabled={groupUsers.length === 0}>Create group</Button></form></Card></div>}
  </div>;
}
