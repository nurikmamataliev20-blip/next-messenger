"use client";

import { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";

type UserProfile = {
  name: string;
  username: string;
  bio: string;
  status: string;
  avatar: string | null;
};

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [status, setStatus] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProfile() {
      const res = await fetch("/api/profile");
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setName(data.name);
        setUsername(data.username);
        setBio(data.bio || "");
        setStatus(data.status || "");
      } else {
        setError("Failed to load profile");
      }
    }
    fetchProfile();
  }, []);

  const handleAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAvatarFile(e.target.files[0]);
    }
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    if (avatarFile) {
      const formData = new FormData();
      formData.append("avatar", avatarFile);
      const avatarRes = await fetch("/api/profile/avatar", {
        method: "POST",
        body: formData,
      });
      if (!avatarRes.ok) {
        setError("Failed to upload avatar");
        setIsSaving(false);
        return;
      }
      const { avatarUrl } = await avatarRes.json();
      setProfile((prev) => (prev ? { ...prev, avatar: avatarUrl } : null));
    }

    const profileRes = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, bio, status }),
    });

    if (!profileRes.ok) {
      setError("Failed to update profile");
    } else {
      router.push("/");// Redirect to home or show success message
    }

    setIsSaving(false);
  };

  if (!profile) {
    return <div className="flex h-screen items-center justify-center bg-zinc-950 text-white">Loading...</div>;
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-zinc-950 p-4 text-white">
      <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-zinc-900 p-8">
        <h1 className="mb-6 text-2xl font-semibold">Profile Settings</h1>
        <form onSubmit={handleSave} className="space-y-6">
          <div className="flex items-center gap-6">
            <div className="relative">
              <img
                src={profile.avatar || `https://avatar.vercel.sh/${username}.png`}
                alt="Avatar"
                className="h-24 w-24 rounded-full object-cover"
              />
              <label
                htmlFor="avatar-upload"
                className="absolute bottom-0 right-0 cursor-pointer rounded-full bg-sky-500 p-2 text-white transition hover:bg-sky-400"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <input id="avatar-upload" type="file" className="hidden" onChange={handleAvatarChange} accept="image/*" />
              </label>
            </div>
            <div className="flex-1">
              <label htmlFor="name" className="block text-sm font-medium text-zinc-400">Name</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full rounded-xl border-white/10 bg-zinc-800 px-4 py-2.5 text-white outline-none ring-sky-400 transition focus:border-sky-400/60 focus:ring-2"
              />
            </div>
          </div>
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-zinc-400">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              disabled
              className="mt-1 block w-full rounded-xl border-white/10 bg-zinc-800 px-4 py-2.5 text-zinc-400 outline-none"
            />
          </div>
          <div>
            <label htmlFor="bio" className="block text-sm font-medium text-zinc-400">Bio</label>
            <textarea
              id="bio"
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="mt-1 block w-full rounded-xl border-white/10 bg-zinc-800 px-4 py-2.5 text-white outline-none ring-sky-400 transition focus:border-sky-400/60 focus:ring-2"
            />
          </div>
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-zinc-400">Status</label>
            <input
              id="status"
              type="text"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-1 block w-full rounded-xl border-white/10 bg-zinc-800 px-4 py-2.5 text-white outline-none ring-sky-400 transition focus:border-sky-400/60 focus:ring-2"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-xl border border-white/10 bg-zinc-800 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-xl bg-sky-500 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
