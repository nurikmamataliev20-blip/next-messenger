"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useRouter } from "next/navigation";

type Chat = {
  id: string;
  type: "DIRECT" | "GROUP" | "SUPERGROUP";
  name: string;
  avatar: string | null;
  membersCount: number;
  lastMessage: string;
  lastMessageAt: string;
};

type ChatRole = "OWNER" | "ADMIN" | "MEMBER" | null;

type GroupMember = {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
  role: "OWNER" | "ADMIN" | "MEMBER";
};

type PublicUserProfile = {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
  bio: string | null;
  status: string | null;
  createdAt: string;
};

type Topic = {
  id: string;
  name: string;
  icon: string | null;
};

type Message = {
  id: string;
  content: string | null;
  createdAt: string;
  senderId: string;
  isMine: boolean;
  topicId: string | null;
  type: "TEXT" | "IMAGE" | "VIDEO" | "AUDIO" | "FILE";
  fileUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  sender: {
    id: string;
    name: string;
    username: string;
    avatar: string | null;
  };
};

type SearchUser = {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
};

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
};

type SocketMessagePayload = {
  chatId?: string;
  message: Message;
};

type SocketTypingPayload = {
  chatId: string;
  userId: string;
  isTyping: boolean;
};

const SOCKET_URL = "http://localhost:3001";

function formatTime(dateString: string) {
  const date = new Date(dateString);

  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function HomePage() {
  const router = useRouter();
  const socketRef = useRef<Socket | null>(null);
  const selectedChatIdRef = useRef<string | null>(null);
  const selectedTopicIdRef = useRef<string | null>(null);
  const selectedChatTypeRef = useRef<Chat["type"] | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [selectedChatType, setSelectedChatType] = useState<Chat["type"] | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [myRole, setMyRole] = useState<ChatRole>(null);
  const [messageInput, setMessageInput] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [isNewGroupModalOpen, setIsNewGroupModalOpen] = useState(false);
  const [groupSearchQuery, setGroupSearchQuery] = useState("");
  const [groupSearchResults, setGroupSearchResults] = useState<SearchUser[]>([]);
  const [groupSelectedUsers, setGroupSelectedUsers] = useState<SearchUser[]>([]);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [groupType, setGroupType] = useState<"GROUP" | "SUPERGROUP">("GROUP");
  const [isSearchingGroupUsers, setIsSearchingGroupUsers] = useState(false);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [isNewTopicModalOpen, setIsNewTopicModalOpen] = useState(false);
  const [newTopicName, setNewTopicName] = useState("");
  const [isCreatingTopic, setIsCreatingTopic] = useState(false);
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [isProfileModalOpen, setProfileModalOpen] = useState(false);
  const [isGroupInfoModalOpen, setGroupInfoModalOpen] = useState(false);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [viewingProfile, setViewingProfile] = useState<PublicUserProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [typingUserId, setTypingUserId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [messageMenuOpenForId, setMessageMenuOpenForId] = useState<string | null>(null);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [profile, setProfile] = useState<{name: string, username: string, avatar: string | null} | null>(null);

  useEffect(() => {
    async function fetchProfile() {
      const res = await fetch("/api/profile");
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
      }
    }
    fetchProfile();
  }, []);

  useEffect(() => {
    async function fetchNotifications() {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    }
    fetchNotifications();
  }, []);

  const unreadNotifications = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  const selectedChat = useMemo(
    () => chats.find((chat) => chat.id === selectedChatId) ?? null,
    [chats, selectedChatId]
  );

  useEffect(() => {
    selectedChatIdRef.current = selectedChatId;
  }, [selectedChatId]);

  useEffect(() => {
    selectedTopicIdRef.current = selectedTopicId;
  }, [selectedTopicId]);

  useEffect(() => {
    selectedChatTypeRef.current = selectedChatType;
  }, [selectedChatType]);

  useEffect(() => {
    if (isGroupInfoModalOpen && selectedChatId) {
      fetchGroupMembers(selectedChatId);
    }
  }, [isGroupInfoModalOpen, selectedChatId]);

  async function fetchGroupMembers(chatId: string) {
    setIsLoadingMembers(true);
    setError(null);

    const res = await fetch(`/api/chats/${chatId}/members`, { cache: "no-store" });

    if (!res.ok) {
      setError("Failed to load members");
      setIsLoadingMembers(false);
      return;
    }

    const data = (await res.json()) as { members: GroupMember[] };
    setGroupMembers(data.members);

    setIsLoadingMembers(false);
  }

  async function loadChats(preferredChatId?: string) {
    setIsLoadingChats(true);
    setError(null);

    const res = await fetch("/api/chats", { cache: "no-store" });

    if (!res.ok) {
      setError("Failed to load chats");
      setIsLoadingChats(false);
      return;
    }

    const data = (await res.json()) as { chats: Chat[] };
    setChats(data.chats);

    if (data.chats.length > 0) {
      const nextChat =
        (preferredChatId && data.chats.find((chat) => chat.id === preferredChatId)) ||
        data.chats[0];

      if (nextChat) {
        setSelectedChatId(nextChat.id);
        setSelectedChatType(nextChat.type);
        setSelectedTopicId(null);
        setTopics([]);
        setMyRole(null);
      } else {
        setSelectedChatId((prev) => prev ?? data.chats[0].id);
      }
    } else {
      setSelectedChatId(null);
      setSelectedChatType(null);
      setSelectedTopicId(null);
      setTopics([]);
      setMyRole(null);
    }

    setIsLoadingChats(false);
  }

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      const res = await fetch("/api/auth/session", { cache: "no-store" });

      if (!res.ok) return;

      const data = (await res.json()) as {
        user?: { id?: string | null };
      };

      if (isMounted) {
        setCurrentUserId(data.user?.id ?? null);
      }
    }

    loadSession();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!currentUserId) return;

    const socket = io(SOCKET_URL, {
      transports: ["websocket"],
      auth: { userId: currentUserId },
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      if (selectedChatIdRef.current) {
        socket.emit("join-chat", { chatId: selectedChatIdRef.current });
      }
    });

    socket.on("receive-message", (payload: Message | SocketMessagePayload) => {
      const normalizedPayload: SocketMessagePayload =
        "message" in payload
          ? payload
          : {
              chatId: selectedChatIdRef.current ?? undefined,
              message: payload,
            };

      const { chatId, message } = normalizedPayload;

      if (!chatId) return;

      const chatInfo = chats.find(c => c.id === chatId);

      if (chatId !== selectedChatIdRef.current) {
        const newNotification = {
          type: "new_message",
          title: chatInfo?.name || "New Message",
          body: message.content || "You received a new message.",
          data: { chatId },
        };

        fetch("/api/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newNotification),
        }).then(res => res.json()).then(notification => {
          setNotifications(prev => [notification, ...prev]);
        });
      }

      setChats((prev) =>
        prev.map((chat) =>
          chat.id === chatId
            ? {
                ...chat,
                lastMessage: message.content || "New message",
                lastMessageAt: message.createdAt,
              }
            : chat
        )
      );

      if (chatId !== selectedChatIdRef.current) return;

      if (
        selectedChatTypeRef.current === "SUPERGROUP" &&
        selectedTopicIdRef.current !== message.topicId
      ) {
        return;
      }

      const finalMessage = {
        ...message,
        isMine: message.sender.id === currentUserId,
      };

      setMessages((prev) =>
        prev.some((item) => item.id === finalMessage.id)
          ? prev
          : [...prev, finalMessage]
      );
    });

    socket.on("typing", ({ chatId, userId, isTyping }: SocketTypingPayload) => {
      if (chatId !== selectedChatIdRef.current) return;
      if (userId === currentUserId) return;

      setTypingUserId(isTyping ? userId : null);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [currentUserId]);

  useEffect(() => {
    if (!selectedChatId) {
      setTypingUserId(null);
      return;
    }

    socketRef.current?.emit("join-chat", { chatId: selectedChatId });
    setTypingUserId(null);
  }, [selectedChatId]);

  useEffect(() => {
    loadChats();
  }, []);

  useEffect(() => {
    if (!isNewChatModalOpen) return;

    const query = searchQuery.trim();
    if (!query) {
      setSearchResults([]);
      return;
    }

    const controller = new AbortController();

    async function searchUsers() {
      setIsSearchingUsers(true);

      const res = await fetch(
        `/api/users/search?q=${encodeURIComponent(query)}`,
        { signal: controller.signal }
      );

      if (!res.ok) {
        if (!controller.signal.aborted) {
          setError("Failed to search users");
          setIsSearchingUsers(false);
        }
        return;
      }

      if (!controller.signal.aborted) {
        const data = (await res.json()) as { users: SearchUser[] };
        setSearchResults(data.users);
        setIsSearchingUsers(false);
      }
    }

    const timeout = setTimeout(searchUsers, 250);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [searchQuery, isNewChatModalOpen]);

  useEffect(() => {
    if (!isNewGroupModalOpen) return;

    const query = groupSearchQuery.trim();
    if (!query) {
      setGroupSearchResults([]);
      return;
    }

    const controller = new AbortController();

    async function searchGroupUsers() {
      setIsSearchingGroupUsers(true);

      const res = await fetch(
        `/api/users/search?q=${encodeURIComponent(query)}`,
        { signal: controller.signal }
      );

      if (!res.ok) {
        if (!controller.signal.aborted) {
          setError("Failed to search users");
          setIsSearchingGroupUsers(false);
        }
        return;
      }

      if (!controller.signal.aborted) {
        const data = (await res.json()) as { users: SearchUser[] };
        setGroupSearchResults(data.users);
        setIsSearchingGroupUsers(false);
      }
    }

    const timeout = setTimeout(searchGroupUsers, 250);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [groupSearchQuery, isNewGroupModalOpen]);

  useEffect(() => {
    if (!selectedChatId) {
      setMessages([]);
      return;
    }

    async function fetchMessages() {
      setIsLoadingMessages(true);

      const topicQuery =
        selectedChatType === "SUPERGROUP" && selectedTopicId
          ? `?topicId=${encodeURIComponent(selectedTopicId)}`
          : "";

      const res = await fetch(
        `/api/chats/${selectedChatId}/messages${topicQuery}`,
        { cache: "no-store" }
      );

      if (!res.ok) {
        setError("Failed to load messages");
        setIsLoadingMessages(false);
        return;
      }

      const data = (await res.json()) as {
        messages: Message[];
        chat?: {
          id: string;
          type: Chat["type"];
          topics: Topic[];
          myRole: ChatRole;
        };
      };

      if (data.chat) {
        setSelectedChatType(data.chat.type);
        setTopics(data.chat.topics ?? []);
        setMyRole(data.chat.myRole);

        if (data.chat.type === "SUPERGROUP") {
          const topicExists = data.chat.topics.some(
            (topic) => topic.id === selectedTopicId
          );
          if (!selectedTopicId || !topicExists) {
            setSelectedTopicId(data.chat.topics[0]?.id ?? null);
            setMessages([]);
            setIsLoadingMessages(false);
            return;
          }
        }
      }

      setMessages(data.messages);
      setIsLoadingMessages(false);
    }

    fetchMessages();
  }, [selectedChatId, selectedChatType, selectedTopicId]);

  useEffect(() => {
    function handleDocumentMouseDown(event: MouseEvent) {
      const target = event.target as HTMLElement | null;

      if (target?.closest("[data-message-menu]")) {
        return;
      }

      setMessageMenuOpenForId(null);
    }

    document.addEventListener("mousedown", handleDocumentMouseDown);

    return () => {
      document.removeEventListener("mousedown", handleDocumentMouseDown);
    };
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          throw new Error("File upload failed");
        }

        const data = await res.json();
        
        const messageRes = await fetch(`/api/chats/${selectedChatId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topicId: selectedTopicId,
            content: "",
            fileUrl: data.url,
            fileName: data.fileName,
            fileSize: data.fileSize,
            mimeType: data.mimeType,
            type: data.type,
          }),
        });

        if (!messageRes.ok) {
          throw new Error("Failed to send message");
        }

        const { message } = await messageRes.json();
        setMessages((prev) => [...prev, message]);
        socketRef.current?.emit("send-message", {
          chatId: selectedChatId,
          message,
        });

      } catch (err) {
        setError(err instanceof Error ? err.message : "An unknown error occurred");
      }
    }
  };

  async function onSendMessage(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!selectedChatId || !messageInput.trim() || isSending || isRecording) return;

    if (selectedChatType === "SUPERGROUP" && !selectedTopicId) {
      setError("Please select a topic first");
      return;
    }

    setIsSending(true);
    setError(null);

    const res = await fetch(`/api/chats/${selectedChatId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: messageInput, topicId: selectedTopicId }),
    });

    if (!res.ok) {
      setError("Failed to send message");
      setIsSending(false);
      return;
    }

    const data = (await res.json()) as { message: Message };
    setMessages((prev) => [...prev, data.message]);
    setChats((prev) =>
      prev.map((chat) =>
        chat.id === selectedChatId
          ? {
              ...chat,
              lastMessage: data.message.content || "New message",
              lastMessageAt: data.message.createdAt,
            }
          : chat
      )
    );
    socketRef.current?.emit("send-message", {
      chatId: selectedChatId,
      message: data.message,
    });
    setMessageInput("");
    socketRef.current?.emit("typing", {
      chatId: selectedChatId,
      isTyping: false,
    });
    setIsSending(false);
  }

  async function handleDeleteMessage(messageId: string) {
    if (!selectedChatId || deletingMessageId === messageId) return;

    const messageIndex = messages.findIndex((message) => message.id === messageId);
    const messageToRestore = messages[messageIndex];

    if (messageIndex === -1 || !messageToRestore) return;

    setMessageMenuOpenForId(null);
    setDeletingMessageId(messageId);
    setError(null);
    setMessages((prev) => prev.filter((message) => message.id !== messageId));

    try {
      const res = await fetch(`/api/chats/${selectedChatId}/messages/${messageId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete message");
      }
    } catch (err) {
      setMessages((prev) => {
        if (prev.some((message) => message.id === messageId)) {
          return prev;
        }

        const nextMessages = [...prev];
        nextMessages.splice(messageIndex, 0, messageToRestore);
        return nextMessages;
      });
      setError(err instanceof Error ? err.message : "Failed to delete message");
    } finally {
      setDeletingMessageId(null);
    }
  }

  function handleMessageChange(value: string) {
    setMessageInput(value);

    if (!selectedChatId) return;

    socketRef.current?.emit("typing", {
      chatId: selectedChatId,
      isTyping: Boolean(value.trim()),
    });
  }

  function toggleGroupUser(user: SearchUser) {
    setGroupSelectedUsers((prev) =>
      prev.some((selected) => selected.id === user.id)
        ? prev.filter((selected) => selected.id !== user.id)
        : [...prev, user]
    );
  }

  async function onCreateGroup() {
    if (isCreatingGroup) return;

    setIsCreatingGroup(true);
    setError(null);

    const res = await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: groupName,
        description: groupDescription,
        type: groupType,
        userIds: groupSelectedUsers.map((user) => user.id),
      }),
    });

    if (!res.ok) {
      setError("Failed to create group");
      setIsCreatingGroup(false);
      return;
    }

    const data = (await res.json()) as { chatId: string };
    await loadChats(data.chatId);
    setIsNewGroupModalOpen(false);
    setGroupSearchQuery("");
    setGroupSearchResults([]);
    setGroupSelectedUsers([]);
    setGroupName("");
    setGroupDescription("");
    setGroupType("GROUP");
    setIsCreatingGroup(false);
  }

  async function onCreateTopic() {
    if (!selectedChatId || isCreatingTopic || !newTopicName.trim()) return;

    setIsCreatingTopic(true);
    setError(null);

    const res = await fetch("/api/topics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId: selectedChatId, name: newTopicName }),
    });

    if (!res.ok) {
      setError("Failed to create topic");
      setIsCreatingTopic(false);
      return;
    }

    const data = (await res.json()) as { topic: Topic };
    setTopics((prev) => [...prev, data.topic]);
    setSelectedTopicId(data.topic.id);
    setIsNewTopicModalOpen(false);
    setNewTopicName("");
    setIsCreatingTopic(false);
  }

  async function onCreateDirectChat(userId: string) {
    if (isCreatingChat) return;

    setIsCreatingChat(true);
    setError(null);

    const res = await fetch("/api/chats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });

    if (!res.ok) {
      setError("Failed to create chat");
      setIsCreatingChat(false);
      return;
    }

    const data = (await res.json()) as { chatId: string };
    await loadChats(data.chatId);
    setIsNewChatModalOpen(false);
    setSearchQuery("");
    setSearchResults([]);
    setIsCreatingChat(false);
  }

  const handleStartRecording = async () => {
  console.log("START RECORDING CALLED")
  try {
    setIsRecording(true)
    console.log("setIsRecording(true) called")
    
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const mediaRecorder = new MediaRecorder(stream)
    mediaRecorderRef.current = mediaRecorder
    audioChunksRef.current = []

    mediaRecorder.ondataavailable = (e) => audioChunksRef.current.push(e.data)
    mediaRecorder.onstop = async () => {
      const blob = new Blob(audioChunksRef.current, { type: "audio/webm" })
      const file = new File([blob], "voice.webm", { type: "audio/webm" })
      const formData = new FormData()
      formData.append("file", file)
      try {
        const res = await fetch("/api/upload", { method: "POST", body: formData })
        const data = await res.json()
        if (data.url && selectedChatId) {
          const messageRes = await fetch(`/api/chats/${selectedChatId}/messages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              topicId: selectedTopicId,
              type: "AUDIO", 
              fileUrl: data.url, 
              fileName: data.fileName, 
              fileSize: data.fileSize, 
              mimeType: data.mimeType 
            })
          })
          const { message } = await messageRes.json()
          setMessages((prev) => [...prev, message])
          socketRef.current?.emit("send-message", { chatId: selectedChatId, message })
        }
      } catch (err) {
        console.error("Upload error:", err)
      }
    }
    mediaRecorder.start()
  } catch (err) {
    console.error("Microphone error:", err)
    setIsRecording(false)
  }
}

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close();
    }
    mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
    setIsRecording(false);
  };

  const [sidebarWidth, setSidebarWidth] = useState(280);
  const sidebarRef = useRef<HTMLElement | null>(null);
  const isResizing = useRef(false);

  useEffect(() => {
    const savedWidth = localStorage.getItem("sidebarWidth");
    if (savedWidth) {
      setSidebarWidth(Number(savedWidth));
    }
  }, []);

  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", stopResizing);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing.current || !sidebarRef.current) return;
    // Calculate new width based on cursor position relative to the sidebar's parent
    const newWidth = e.clientX - (sidebarRef.current.parentElement?.getBoundingClientRect().left || 0);
    if (newWidth >= 60 && newWidth <= 500) {
      setSidebarWidth(newWidth);
    }
  };

  const stopResizing = () => {
    if (isResizing.current) {
        isResizing.current = false;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", stopResizing);
        localStorage.setItem("sidebarWidth", String(sidebarWidth));
    }
  };

  return (
    <main className="flex h-screen w-full overflow-hidden bg-zinc-950">
      <aside 
        ref={sidebarRef}
        style={{ width: `${sidebarWidth}px`, minWidth: '60px' }}
        className="flex flex-col border-r border-white/10 bg-zinc-900/80 shrink-0"
      >
        <div className="border-b border-white/10 p-4">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-lg font-semibold tracking-tight">Chats</h1>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsNewChatModalOpen(true)}
                className="rounded-xl bg-sky-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-sky-400"
              >
                New Chat
              </button>
              <button
                type="button"
                onClick={() => setIsNewGroupModalOpen(true)}
                className="rounded-xl border border-white/10 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-100 transition hover:bg-white/5"
              >
                New Group
              </button>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsNotificationsOpen((prev) => !prev)}
                  className="rounded-full p-2 text-zinc-400 transition hover:bg-white/10 hover:text-white"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {unreadNotifications > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                      {unreadNotifications}
                    </span>
                  )}
                </button>
                {isNotificationsOpen && (
                  <div className="absolute top-full right-0 mt-2 w-80 rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl z-10">
                    <div className="p-4 border-b border-white/10 flex justify-between items-center">
                      <h4 className="text-sm font-semibold">Notifications</h4>
                      <button onClick={async () => {
                        await fetch('/api/notifications/read-all', { method: 'PATCH' });
                        setNotifications(notifications.map(n => ({...n, read: true})));
                      }} className="text-xs text-sky-400 hover:underline">Mark all as read</button>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <p className="p-4 text-sm text-zinc-500">No notifications yet.</p>
                      ) : (
                        notifications.map((notification) => (
                          <div key={notification.id} className={`p-4 border-b border-white/10 ${!notification.read ? 'bg-sky-500/10' : ''}`}>
                            <p className="font-semibold text-sm text-zinc-100">{notification.title}</p>
                            <p className="text-xs text-zinc-400 mt-1">{notification.body}</p>
                            <p className="text-[10px] text-zinc-500 mt-2">{formatTime(notification.createdAt)}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="mt-3 rounded-xl border border-white/10 bg-zinc-950/80 px-3 py-2 text-sm text-zinc-400">
            {isLoadingChats ? "Loading chats..." : `${chats.length} conversations`}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {chats.map((chat) => {
            const isActive = chat.id === selectedChatId;

            return (
              <button
                key={chat.id}
                className={`mb-1 flex w-full items-start gap-3 rounded-xl p-3 text-left transition ${
                  isActive
                    ? "bg-sky-500/20 ring-1 ring-sky-400/30"
                    : "hover:bg-white/5"
                }`}
                type="button"
                onClick={() => {
                  setSelectedChatId(chat.id);
                  setSelectedChatType(chat.type);
                  setSelectedTopicId(null);
                  setTopics([]);
                  setMyRole(null);
                }}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-indigo-500 text-sm font-semibold text-white">
                  {chat.name.slice(0, 1)}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-zinc-100">
                      {chat.name}
                    </p>
                    <span className="shrink-0 text-xs text-zinc-500">
                      {formatTime(chat.lastMessageAt)}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-zinc-400">
                    {chat.lastMessage}
                  </p>
                </div>
              </button>
            );
          })}

          {!isLoadingChats && chats.length === 0 ? (
            <p className="px-3 py-4 text-sm text-zinc-500">No chats yet.</p>
          ) : null}
        </div>

        <div className="p-4 border-t border-white/10">
            <button onClick={() => router.push('/profile')} className="flex items-center gap-3 w-full text-left p-2 rounded-lg hover:bg-white/5 transition">
                <img src={profile?.avatar || `https://avatar.vercel.sh/${profile?.username}.png`} alt="avatar" className="h-10 w-10 rounded-full" />
                <div className="flex-1">
                    <p className="text-sm font-semibold text-zinc-100">{profile?.name}</p>
                    <p className="text-xs text-zinc-400">@{profile?.username}</p>
                </div>
            </button>
        </div>
      </aside>

      <div
        onMouseDown={startResizing}
        className="w-1 cursor-col-resize bg-zinc-800 hover:bg-sky-500 transition-colors"
      />
      <section className="flex h-screen flex-1 flex-col overflow-hidden bg-zinc-950 min-w-0 min-w-0 min-w-0">
        <header className="flex items-center justify-between border-b border-white/10 bg-zinc-900/50 px-5 py-4 backdrop-blur">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">
              {selectedChat?.name || "Select a chat"}
            </h2>
            <p className="text-xs text-zinc-400">
              {selectedChat
                ? `${selectedChat.membersCount} members`
                : "No chat selected"}
            </p>
            {typingUserId ? (
              <p className="mt-1 text-xs text-sky-300">Typing…</p>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            {selectedChat && (selectedChat.type === "GROUP" || selectedChat.type === "SUPERGROUP") && (
              <button
                onClick={() => setGroupInfoModalOpen(true)}
                className="rounded-full p-2 text-zinc-400 transition hover:bg-white/10 hover:text-white"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            )}
            <div className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300">
              Encrypted
            </div>
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          {selectedChatType === "SUPERGROUP" ? (
            <aside className="hidden w-64 shrink-0 border-r border-white/10 bg-zinc-900/50 p-4 lg:flex lg:flex-col">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-zinc-100">Topics</h3>
                {myRole === "OWNER" || myRole === "ADMIN" ? (
                  <button
                    type="button"
                    onClick={() => setIsNewTopicModalOpen(true)}
                    className="rounded-lg border border-white/10 px-2.5 py-1 text-[11px] text-zinc-200 transition hover:bg-white/5"
                  >
                    New Topic
                  </button>
                ) : null}
              </div>

              <div className="mt-4 space-y-1 overflow-y-auto">
                {topics.map((topic) => {
                  const isActive = topic.id === selectedTopicId;

                  return (
                    <button
                      key={topic.id}
                      type="button"
                      onClick={() => setSelectedTopicId(topic.id)}
                      className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition ${
                        isActive
                          ? "bg-sky-500/20 text-white ring-1 ring-sky-400/30"
                          : "text-zinc-300 hover:bg-white/5"
                      }`}
                    >
                      <span className="text-sm">{topic.icon || "#"}</span>
                      <span className="truncate text-sm">{topic.name}</span>
                    </button>
                  );
                })}

                {!topics.length ? (
                  <p className="px-3 py-2 text-sm text-zinc-500">No topics yet.</p>
                ) : null}
              </div>
            </aside>
          ) : null}

          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 overflow-y-auto p-6">
              {isLoadingMessages ? (
                <p className="text-sm text-zinc-400">Loading messages...</p>
              ) : messages.length > 0 ? (
                <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
                  {messages.map((message) => {
                    const isMine = message.isMine ?? message.sender.id === currentUserId;
                    const isMessageMenuOpen = messageMenuOpenForId === message.id;

                    return (
                      <div
                        key={message.id}
                        className={`flex w-full ${isMine ? "justify-end" : "justify-start"}`}
                      >
                        <div className={`flex max-w-[70%] flex-col min-w-0 overflow-hidden ${isMine ? "items-end" : "items-start"}`}>
                          {!isMine ? (
                            <div className="mb-1.5 flex items-center gap-2 px-1">
                              {message.sender.avatar ? (
                                <img
                                  src={message.sender.avatar}
                                  alt={message.sender.name || message.sender.username}
                                  className="h-6 w-6 rounded-full object-cover"
                                />
                              ) : (
                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-700 text-[10px] font-semibold text-zinc-200">
                                  {(message.sender.name || message.sender.username)
                                    .slice(0, 1)
                                    .toUpperCase()}
                                </div>
                              )}
                              <p className="text-xs text-zinc-400">
                                {message.sender.name || message.sender.username}
                              </p>
                            </div>
                          ) : null}

                          <div
                            className={`group relative rounded-2xl px-4 py-2.5 text-sm shadow overflow-hidden break-words overflow-hidden break-words ${
                              isMine
                                ? "bg-blue-600 text-white"
                                : "bg-gray-700 text-zinc-100"
                            }`}
                          >
                            {isMine ? (
                              <div data-message-menu className="absolute -right-1 top-1 z-10 flex items-center">
                                <button
                                  type="button"
                                  aria-label="Message options"
                                  onClick={() =>
                                    setMessageMenuOpenForId((prev) =>
                                      prev === message.id ? null : message.id
                                    )
                                  }
                                  className={`flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-zinc-950/90 text-zinc-200 shadow-lg transition hover:bg-zinc-900 hover:text-white ${
                                    isMessageMenuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                                  }`}
                                >
                                  <span className="text-lg leading-none">···</span>
                                </button>

                                {isMessageMenuOpen ? (
                                  <div className="absolute right-0 top-10 z-20 w-36 overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/95 shadow-2xl backdrop-blur">
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteMessage(message.id)}
                                      disabled={deletingMessageId === message.id}
                                      className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-red-300 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3m-4 0h14" />
                                      </svg>
                                      Delete
                                    </button>
                                  </div>
                                ) : null}
                              </div>
                            ) : null}

                            {message.type === "TEXT" && <p>{message.content}</p>}
                            {message.type === "IMAGE" && message.fileUrl && (
                              <img 
                                onClick={() => setLightboxImage(message.fileUrl)}
                                src={message.fileUrl} 
                                alt="Image"
                                className="mt-2 max-w-full w-full cursor-pointer rounded-lg object-contain"
                              />
                            )}
                            {message.type === "VIDEO" && message.fileUrl && (
                              <video src={message.fileUrl} controls className="max-w-xs rounded-lg" />
                            )}
                            {message.type === "AUDIO" && message.fileUrl && (
                              <div className="flex items-center gap-2 p-2">
                                <audio controls src={message.fileUrl} className="h-8 w-48" />
                              </div>
                            )}
                            {message.type === "FILE" && message.fileUrl && (
                              <div className="flex items-center gap-3 rounded-lg bg-zinc-800/50 p-3">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                <div className="flex-1">
                                  <p className="font-medium text-sm truncate">{message.fileName}</p>
                                  <p className="text-xs text-zinc-400">{message.fileSize ? `${(message.fileSize / 1024).toFixed(2)} KB` : ''}</p>
                                </div>
                                <a href={message.fileUrl} target="_blank" rel="noopener noreferrer" className="rounded-full bg-zinc-700 p-2 text-white transition hover:bg-zinc-600">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                </a>
                              </div>
                            )}
                            <p
                              className={`mt-1 text-right text-[10px] ${
                                isMine ? "text-blue-100/80" : "text-zinc-400"
                              }`}
                            >
                              {formatTime(message.createdAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-zinc-900/60 p-8 text-center shadow-2xl">
                    <p className="text-xl font-semibold tracking-tight text-zinc-100">
                      {selectedChat ? "No messages yet" : "Welcome to Next Messenger"}
                    </p>
                    <p className="mt-3 text-sm leading-6 text-zinc-400">
                      {selectedChat
                        ? selectedChatType === "SUPERGROUP"
                          ? "Choose a topic or start a conversation in the selected topic."
                          : "Start the conversation by sending your first message."
                        : "Select a chat from the sidebar to start messaging."}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <form
              onSubmit={onSendMessage}
              className="shrink-0 border-t border-white/10 bg-zinc-900/60 p-4"
            >
              <div className="mx-auto flex w-full max-w-3xl items-center gap-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                  multiple={false}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-full p-2 text-zinc-400 transition hover:bg-white/10 hover:text-white"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                </button>
                {isRecording ? (
                  <div className="flex-1 flex items-center gap-2">
                    <span className="text-sm text-red-400 animate-pulse">Recording...</span>
                    <canvas ref={canvasRef} className="w-full h-10 rounded-xl" />
                  </div>
                ) : (
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => handleMessageChange(e.target.value)}
                    placeholder={
                      selectedChat
                        ? selectedChatType === "SUPERGROUP" && selectedTopicId
                          ? `Write in ${topics.find((topic) => topic.id === selectedTopicId)?.name || "topic"}...`
                          : "Write a message..."
                        : "Choose a chat first"
                    }
                    disabled={
                      !selectedChat || isSending || (selectedChatType === "SUPERGROUP" && !selectedTopicId)
                    }
                    className="flex-1 rounded-xl border border-white/10 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-100 outline-none ring-sky-400 transition focus:border-sky-400/60 focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                )}
                <button
                  type="submit"
                  disabled={!selectedChat || !messageInput.trim() || isSending || isRecording}
                  className="rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSending ? "Sending..." : "Send"}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    console.log("MIC CLICKED");
                    if (isRecording) {
                      handleStopRecording()
                    } else {
                      await handleStartRecording()
                    }
                  }}
                  style={{ pointerEvents: 'auto', zIndex: 50, position: 'relative' }}
                  className={`rounded-full p-2.5 text-white transition ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-sky-500 hover:bg-sky-400'}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                    <line x1="12" y1="19" x2="12" y2="22"/>
                  </svg>
                </button>
              </div>
              {error ? (
                <p className="mx-auto mt-2 w-full max-w-3xl text-xs text-red-400">
                  {error}
                </p>
              ) : null}
            </form>
          </div>
        </div>
      </section>

      {isNewChatModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-zinc-900 p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-zinc-100">Start new chat</h3>
              <button
                type="button"
                onClick={() => {
                  setIsNewChatModalOpen(false);
                  setSearchQuery("");
                  setSearchResults([]);
                }}
                className="rounded-lg border border-white/10 px-2.5 py-1 text-xs text-zinc-300 transition hover:bg-white/5"
              >
                Close
              </button>
            </div>

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by username or name"
              className="w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-100 outline-none ring-sky-400 transition focus:border-sky-400/60 focus:ring-2"
            />

            <div className="mt-4 max-h-72 overflow-y-auto">
              {isSearchingUsers ? (
                <p className="px-2 py-3 text-sm text-zinc-400">Searching users...</p>
              ) : searchQuery.trim() && searchResults.length === 0 ? (
                <p className="px-2 py-3 text-sm text-zinc-500">No users found.</p>
              ) : (
                searchResults.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    disabled={isCreatingChat}
                    onClick={() => onCreateDirectChat(user.id)}
                    className="mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-indigo-500 text-xs font-semibold text-white">
                      {(user.name || user.username).slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-100">{user.name}</p>
                      <p className="truncate text-xs text-zinc-400">@{user.username}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}

      {isNewGroupModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-zinc-900 p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-zinc-100">Create group</h3>
              <button
                type="button"
                onClick={() => {
                  setIsNewGroupModalOpen(false);
                  setGroupSearchQuery("");
                  setGroupSearchResults([]);
                  setGroupSelectedUsers([]);
                  setGroupName("");
                  setGroupDescription("");
                  setGroupType("GROUP");
                }}
                className="rounded-lg border border-white/10 px-2.5 py-1 text-xs text-zinc-300 transition hover:bg-white/5"
              >
                Close
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Group name"
                  className="w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-100 outline-none ring-sky-400 transition focus:border-sky-400/60 focus:ring-2"
                />
                <textarea
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  placeholder="Description"
                  rows={3}
                  className="w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-100 outline-none ring-sky-400 transition focus:border-sky-400/60 focus:ring-2"
                />

                <div className="rounded-xl border border-white/10 bg-zinc-950 p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                    Type
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setGroupType("GROUP")}
                      className={`flex-1 rounded-xl px-3 py-2 text-sm transition ${
                        groupType === "GROUP"
                          ? "bg-sky-500 text-white"
                          : "border border-white/10 text-zinc-300 hover:bg-white/5"
                      }`}
                    >
                      GROUP
                    </button>
                    <button
                      type="button"
                      onClick={() => setGroupType("SUPERGROUP")}
                      className={`flex-1 rounded-xl px-3 py-2 text-sm transition ${
                        groupType === "SUPERGROUP"
                          ? "bg-sky-500 text-white"
                          : "border border-white/10 text-zinc-300 hover:bg-white/5"
                      }`}
                    >
                      SUPERGROUP
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onCreateGroup}
                  disabled={isCreatingGroup || !groupName.trim() || !groupSelectedUsers.length}
                  className="w-full rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isCreatingGroup ? "Creating..." : "Create group"}
                </button>
              </div>

              <div className="rounded-2xl border border-white/10 bg-zinc-950 p-3">
                <div className="flex flex-wrap gap-2">
                  {groupSelectedUsers.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => toggleGroupUser(user)}
                      className="rounded-full border border-sky-400/30 bg-sky-500/10 px-3 py-1 text-xs text-sky-200 transition hover:bg-sky-500/20"
                    >
                      @{user.username} ×
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  value={groupSearchQuery}
                  onChange={(e) => setGroupSearchQuery(e.target.value)}
                  placeholder="Search users to add"
                  className="mt-3 w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 outline-none ring-sky-400 transition focus:border-sky-400/60 focus:ring-2"
                />

                <div className="mt-3 max-h-72 space-y-1 overflow-y-auto">
                  {isSearchingGroupUsers ? (
                    <p className="px-2 py-3 text-sm text-zinc-400">Searching users...</p>
                  ) : groupSearchQuery.trim() && groupSearchResults.length === 0 ? (
                    <p className="px-2 py-3 text-sm text-zinc-500">No users found.</p>
                  ) : (
                    groupSearchResults.map((user) => {
                      const selected = groupSelectedUsers.some((item) => item.id === user.id);

                      return (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => toggleGroupUser(user)}
                          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition ${
                            selected ? "bg-sky-500/20" : "hover:bg-white/5"
                          }`}
                        >
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-indigo-500 text-xs font-semibold text-white">
                            {(user.name || user.username).slice(0, 1).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-zinc-100">{user.name}</p>
                            <p className="truncate text-xs text-zinc-400">@{user.username}</p>
                          </div>
                          <span className="text-xs text-zinc-400">{selected ? "Added" : "Add"}</span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isNewTopicModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-900 p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-zinc-100">Create topic</h3>
              <button
                type="button"
                onClick={() => {
                  setIsNewTopicModalOpen(false);
                  setNewTopicName("");
                }}
                className="rounded-lg border border-white/10 px-2.5 py-1 text-xs text-zinc-300 transition hover:bg-white/5"
              >
                Close
              </button>
            </div>

            <input
              type="text"
              value={newTopicName}
              onChange={(e) => setNewTopicName(e.target.value)}
              placeholder="Topic name"
              className="w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-100 outline-none ring-sky-400 transition focus:border-sky-400/60 focus:ring-2"
            />

            <button
              type="button"
              onClick={onCreateTopic}
              disabled={isCreatingTopic || !newTopicName.trim()}
              className="mt-4 w-full rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCreatingTopic ? "Creating..." : "Create topic"}
            </button>
          </div>
        </div>
      ) : null}

      {lightboxImage ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightboxImage(null)}
        >
          <button
            type="button"
            aria-label="Close image preview"
            className="absolute right-4 top-4 rounded-full border border-white/20 bg-zinc-900/80 px-3 py-1.5 text-lg text-white transition hover:bg-zinc-800"
            onClick={() => setLightboxImage(null)}
          >
            ×
          </button>
          <img
            src={lightboxImage}
            alt="Image preview"
            className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}
    </main>
  );
}