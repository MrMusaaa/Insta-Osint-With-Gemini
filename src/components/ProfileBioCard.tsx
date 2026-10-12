import React, { useState, useRef } from "react";
import { UserProfile } from "../types";
import {
  Users,
  ExternalLink,
  Copy,
  Check,
  Maximize2,
  X,
  Download,
  Edit3,
  Camera,
  Upload,
  RefreshCw,
  Sparkles,
  Lock,
  BadgeCheck,
} from "lucide-react";
import { getInstagramAvatarUrl } from "../utils/instagramParser";

interface ProfileBioCardProps {
  profile: UserProfile | null;
  onUpdateBio?: (newBio: string) => Promise<void> | void;
  onUpdateAvatar?: (avatarData: string) => Promise<void> | void;
  onImportSource?: (rawSource: string) => Promise<void>;
  onBypassModal?: () => void;
  onInstaloaderFetch?: () => void;
  isInstaloaderLoading?: boolean;
}

export const ProfileBioCard: React.FC<ProfileBioCardProps> = ({
  profile,
  onUpdateBio,
  onUpdateAvatar,
  onInstaloaderFetch,
  isInstaloaderLoading,
}) => {
  const [copied, setCopied] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Avatar state
  const [avatarFallbackStep, setAvatarFallbackStep] = useState(0);
  const [cdnUrlInput, setCdnUrlInput] = useState("");
  const [uploadedPreview, setUploadedPreview] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Bio editing
  const [editedBio, setEditedBio] = useState(profile?.bio || "");
  const [isSavingBio, setIsSavingBio] = useState(false);

  React.useEffect(() => {
    setAvatarFallbackStep(0);
    setEditedBio(profile?.bio || "");
  }, [profile?.profilePicUrl, profile?.username, profile?.bio]);

  if (!profile) return null;

  const getResolvedAvatar = (): string => {
    const rawPic = profile.profilePicUrl;
    if (avatarFallbackStep === 0) {
      if (rawPic && rawPic.trim()) return rawPic;
      return getInstagramAvatarUrl(profile.username);
    }
    if (avatarFallbackStep === 1) {
      if (rawPic && rawPic.startsWith("http")) {
        return `/api/proxy-image?url=${encodeURIComponent(rawPic)}`;
      }
      return getInstagramAvatarUrl(profile.username);
    }
    return getInstagramAvatarUrl(profile.username);
  };

  const currentAvatar = getResolvedAvatar();

  const handleCopyBio = () => {
    if (profile.bio) {
      navigator.clipboard.writeText(profile.bio);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSaveBio = async () => {
    if (onUpdateBio && editedBio.trim()) {
      setIsSavingBio(true);
      try {
        await onUpdateBio(editedBio.trim());
        setShowEditModal(false);
      } finally {
        setIsSavingBio(false);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (dataUrl) {
        setUploadedPreview(dataUrl);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSaveUploadedAvatar = async (avatarSource?: string) => {
    const sourceToUse = avatarSource || uploadedPreview || cdnUrlInput;
    if (!sourceToUse || !onUpdateAvatar) return;
    setIsUploadingAvatar(true);
    try {
      await onUpdateAvatar(sourceToUse);
      setAvatarFallbackStep(0);
      setUploadedPreview(null);
      setCdnUrlInput("");
      setShowEditModal(false);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const directProfileUrl =
    profile.profileUrl || `https://www.instagram.com/${profile.username}/`;

  return (
    <>
      <div className="relative overflow-hidden bg-gradient-to-b from-zinc-900/80 to-zinc-950/90 border border-zinc-800/80 rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-xl transition-all">
        {/* Subtle ambient background glow */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-pink-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          {/* Left Column: Avatar & Basic Information */}
          <div className="flex items-start sm:items-center gap-5 sm:gap-6 flex-1 min-w-0">
            {/* HD Avatar with Instagram-style gradient ring */}
            <div className="relative group shrink-0">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full p-[2.5px] bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 shadow-lg shadow-pink-500/10 transition-transform duration-300 group-hover:scale-105">
                <img
                  src={currentAvatar}
                  alt={`@${profile.username}`}
                  referrerPolicy="no-referrer"
                  onError={() => setAvatarFallbackStep((prev) => prev + 1)}
                  className="w-full h-full rounded-full object-cover bg-zinc-900 cursor-pointer"
                  onClick={() => setShowImageModal(true)}
                />
              </div>

              {/* Click to zoom indicator */}
              <button
                type="button"
                onClick={() => setShowImageModal(true)}
                className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white cursor-pointer"
                title="Büyük Görseli İncele"
              >
                <Maximize2 className="w-5 h-5 drop-shadow-md" />
              </button>
            </div>

            {/* User identity & metadata */}
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-100 truncate">
                  {profile.fullName || profile.username}
                </h2>

                {profile.isVerified && (
                  <span title="Doğrulanmış Hesap" className="inline-flex">
                    <BadgeCheck className="w-5 h-5 text-sky-400 shrink-0" />
                  </span>
                )}

                {profile.isPrivate && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-400 bg-zinc-800/60 px-2 py-0.5 rounded-md border border-zinc-700/50">
                    <Lock className="w-3 h-3 text-amber-400" />
                    <span>Gizli Hesap</span>
                  </span>
                )}
              </div>

              {/* Handle & External Link */}
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <span className="font-mono text-pink-400 font-medium">@{profile.username}</span>
                <span className="text-zinc-600">·</span>
                <a
                  href={directProfileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  <span>Instagram'da Aç</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>

          {/* Right Column: Statistics Grid */}
          <div className="flex items-center gap-2 sm:gap-4 bg-zinc-900/50 border border-zinc-800/80 rounded-xl px-5 py-3 text-xs w-full md:w-auto justify-around shrink-0">
            <div className="text-center px-2">
              <div className="text-zinc-500 text-[10px] uppercase font-semibold tracking-wider">
                Gönderi
              </div>
              <div className="text-zinc-100 font-mono tabular-nums font-bold text-base sm:text-lg mt-0.5">
                {profile.posts || (profile.isPrivate ? "0 (Gizli)" : "0")}
              </div>
            </div>

            <div className="h-8 w-px bg-zinc-800" />

            <div className="text-center px-2">
              <div className="text-zinc-500 text-[10px] uppercase font-semibold tracking-wider">
                Takipçi
              </div>
              <div className="text-zinc-100 font-mono tabular-nums font-bold text-base sm:text-lg mt-0.5 text-pink-400">
                {profile.followers || "0"}
              </div>
            </div>

            <div className="h-8 w-px bg-zinc-800" />

            <div className="text-center px-2">
              <div className="text-zinc-500 text-[10px] uppercase font-semibold tracking-wider">
                Takip
              </div>
              <div className="text-zinc-100 font-mono tabular-nums font-bold text-base sm:text-lg mt-0.5">
                {profile.following || "0"}
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="my-5 border-t border-zinc-800/60" />

        {/* Biography & Quick Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-1.5 flex-1 min-w-0 pr-4">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
              Biyografi
            </span>
            {profile.bio ? (
              <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-line font-normal selection:bg-pink-500/30">
                {profile.bio.split(/(\s+)/).map((word, idx) => {
                  if (word.startsWith("@") || word.startsWith("#")) {
                    return (
                      <span key={idx} className="text-pink-400 font-medium hover:underline cursor-pointer">
                        {word}
                      </span>
                    );
                  }
                  return word;
                })}
              </p>
            ) : (
              <p className="text-sm text-zinc-500 italic">
                Biyografi bilgisi bulunamadı veya boş.
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {profile.bio && (
              <button
                type="button"
                onClick={handleCopyBio}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800/70 hover:bg-zinc-800 text-zinc-300 text-xs font-medium border border-zinc-700/60 transition-all cursor-pointer"
                title="Biyografiyi Kopyala"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
                <span>{copied ? "Kopyalandı" : "Kopyala"}</span>
              </button>
            )}

            {onInstaloaderFetch && (
              <button
                type="button"
                onClick={onInstaloaderFetch}
                disabled={isInstaloaderLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800/70 hover:bg-zinc-800 text-zinc-300 text-xs font-medium border border-zinc-700/60 transition-all cursor-pointer disabled:opacity-50"
                title="Instagram'dan Profil Bilgilerini Yenile"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-pink-400 ${isInstaloaderLoading ? "animate-spin" : ""}`} />
                <span>Yenile</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowEditModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800/70 hover:bg-zinc-800 text-zinc-300 text-xs font-medium border border-zinc-700/60 transition-all cursor-pointer"
              title="Biyografi veya Fotoğrafı Düzenle"
            >
              <Edit3 className="w-3.5 h-3.5 text-amber-400" />
              <span>Düzenle</span>
            </button>
          </div>
        </div>

        {/* Diagnostics / Source status footnote */}
        {profile.diagnostics && (
          <div className="mt-4 pt-3 border-t border-zinc-800/40 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
            <span className="flex items-center gap-1.5 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
              <span className="truncate">{profile.diagnostics}</span>
            </span>
            <span className="shrink-0 text-zinc-600 ml-2">
              {profile.fetchedAt ? new Date(profile.fetchedAt).toLocaleTimeString("tr-TR") : ""}
            </span>
          </div>
        )}
      </div>

      {/* Edit Bio & Avatar Modal */}
      {showEditModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setShowEditModal(false)}
        >
          <div
            className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-zinc-100">
                Profil Bilgilerini Düzenle
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-zinc-400 hover:text-zinc-100 p-1 rounded-lg hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Biyografi Metni
                </label>
                <textarea
                  rows={4}
                  value={editedBio}
                  onChange={(e) => setEditedBio(e.target.value)}
                  placeholder="Profil biyografisi..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs font-mono text-zinc-100 focus:outline-none focus:border-pink-500/60"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Profil Fotoğrafı Yükle / Değiştir
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-medium cursor-pointer border border-zinc-700"
                  >
                    Bilgisayardan Resim Seç
                  </button>
                  {uploadedPreview && (
                    <span className="text-xs text-emerald-400">Yeni resim seçildi ✓</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-medium cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="button"
                disabled={isSavingBio || isUploadingAvatar}
                onClick={async () => {
                  if (uploadedPreview) {
                    await handleSaveUploadedAvatar();
                  }
                  await handleSaveBio();
                }}
                className="px-4 py-2 bg-pink-600 hover:bg-pink-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                {isSavingBio || isUploadingAvatar ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal for Profile Picture in Full Resolution */}
      {showImageModal && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setShowImageModal(false)}
        >
          <div
            className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-pink-400" />
                <h4 className="text-sm font-bold text-zinc-100 font-mono">
                  @{profile.username}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowImageModal(false)}
                className="text-zinc-400 hover:text-zinc-100 p-1 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex justify-center p-2">
              <div className="w-56 h-56 rounded-full p-1 bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 shadow-2xl">
                <img
                  src={currentAvatar}
                  alt={`@${profile.username} HD Photo`}
                  referrerPolicy="no-referrer"
                  className="w-full h-full rounded-full object-cover bg-zinc-950"
                />
              </div>
            </div>

            <div className="text-center text-xs text-zinc-400 font-mono">
              <div className="font-semibold text-zinc-200">{profile.fullName || `@${profile.username}`}</div>
              <div className="text-[11px] text-zinc-500 mt-1">
                {profile.followers || "0"} takipçi · {profile.following || "0"} takip
              </div>
            </div>

            <div className="pt-2">
              <a
                href={currentAvatar}
                download={`${profile.username}_instagram_avatar.jpg`}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-pink-400" />
                <span>Fotoğrafı İndir</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
