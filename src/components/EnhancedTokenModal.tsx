"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useConnection } from "@solana/wallet-adapter-react";
import {
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";

const RECEIVE_WALLET = process.env.NEXT_PUBLIC_RECEIVE_WALLET || "";
const PRICE_SOL = 0.1; // ~$20 in SOL — adjust as needed

type Step = 1 | 2 | 3;

interface TokenMeta {
  name: string;
  symbol: string;
  image: string;
}

interface FormData {
  chain: string;
  tokenAddress: string;
  description: string;
  website: string;
  twitter: string;
  telegram: string;
  discord: string;
  tiktok: string;
  instagram: string;
  reddit: string;
  youtube: string;
  additionalLinks: string[];
  icon: File | null;
  iconPreview: string;
  header: File | null;
  headerPreview: string;
  agreedTerms: boolean;
  agreedModify: boolean;
}

const defaultForm: FormData = {
  chain: "Solana",
  tokenAddress: "",
  description: "",
  website: "",
  twitter: "",
  telegram: "",
  discord: "",
  tiktok: "",
  instagram: "",
  reddit: "",
  youtube: "",
  additionalLinks: [],
  icon: null,
  iconPreview: "",
  header: null,
  headerPreview: "",
  agreedTerms: false,
  agreedModify: false,
};

function InputField({ label, placeholder, value, onChange }: {
  label: string; placeholder: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-foreground-secondary block mb-1.5">{label}</label>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-surface border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted/40 focus:outline-none focus:border-accent/50 transition-colors"
      />
    </div>
  );
}

export default function EnhancedTokenModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormData>(defaultForm);
  const [tokenMeta, setTokenMeta] = useState<TokenMeta | null>(null);
  const [metaLoading, setMetaLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState("");
  const [paySuccess, setPaySuccess] = useState(false);
  const iconInputRef = useRef<HTMLInputElement>(null);
  const headerInputRef = useRef<HTMLInputElement>(null);

  const { publicKey, sendTransaction, connected } = useWallet();
  const { setVisible: setWalletModalVisible } = useWalletModal();
  const { connection } = useConnection();

  const update = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // Fetch token metadata when address changes
  const fetchTokenMeta = useCallback(async (address: string) => {
    if (address.length < 32) {
      setTokenMeta(null);
      return;
    }
    setMetaLoading(true);
    try {
      const res = await fetch(`/api/token-metadata?mint=${address}`);
      if (res.ok) {
        const data = await res.json();
        setTokenMeta(data);
      } else {
        setTokenMeta(null);
      }
    } catch {
      setTokenMeta(null);
    } finally {
      setMetaLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (form.tokenAddress) fetchTokenMeta(form.tokenAddress);
    }, 500);
    return () => clearTimeout(timeout);
  }, [form.tokenAddress, fetchTokenMeta]);

  const handleFileChange = (type: "icon" | "header", file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      if (type === "icon") {
        update("icon", file);
        update("iconPreview", e.target?.result as string);
      } else {
        update("header", file);
        update("headerPreview", e.target?.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const addLink = () => {
    update("additionalLinks", [...form.additionalLinks, ""]);
  };

  const updateLink = (index: number, value: string) => {
    const links = [...form.additionalLinks];
    links[index] = value;
    update("additionalLinks", links);
  };

  const removeLink = (index: number) => {
    update("additionalLinks", form.additionalLinks.filter((_, i) => i !== index));
  };

  const handlePay = async () => {
    if (!connected || !publicKey) {
      setWalletModalVisible(true);
      return;
    }

    setPaying(true);
    setPayError("");

    try {
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey(RECEIVE_WALLET),
          lamports: Math.round(PRICE_SOL * LAMPORTS_PER_SOL),
        })
      );

      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, "confirmed");

      setPaySuccess(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Transaction failed";
      if (msg.includes("User rejected")) {
        setPayError("Transaction cancelled");
      } else {
        setPayError(msg);
      }
    } finally {
      setPaying(false);
    }
  };

  const canProceedStep1 = form.tokenAddress.length > 0;
  const canOrder = form.agreedTerms && form.agreedModify;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />

      <div className="relative w-full max-w-2xl max-h-[90vh] bg-background border border-border-bright rounded-2xl overflow-hidden shadow-2xl flex flex-col animate-in">
        {/* Header */}
        <div className="border-b border-border px-6 py-4 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs text-muted mb-1">
                <span>Home</span>
                <span>/</span>
                <span>Enhanced Token Info</span>
                <span>/</span>
                <span className="text-foreground-secondary">
                  {step === 1 ? "Details" : step === 2 ? "Images" : "Order"}
                </span>
              </div>
              <h2 className="text-xl font-bold text-foreground">Enhanced Token Info</h2>
            </div>
            <button onClick={onClose}
              className="w-8 h-8 rounded-lg bg-surface border border-border flex items-center justify-center text-muted hover:text-foreground transition-all">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mt-4">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                  step === s ? "bg-accent text-white" : step > s ? "bg-green text-white" : "bg-surface text-muted border border-border"
                }`}>
                  {step > s ? (
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : s}
                </div>
                <span className={`text-xs font-medium ${step === s ? "text-foreground" : "text-muted"}`}>
                  {s === 1 ? "Details" : s === 2 ? "Images" : "Order"}
                </span>
                {s < 3 && <div className={`flex-1 h-px ${step > s ? "bg-green" : "bg-border"}`} />}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Details */}
          {step === 1 && (
            <div className="space-y-5">
              {/* Chain */}
              <div>
                <label className="text-xs font-medium text-foreground-secondary block mb-1.5">Chain</label>
                <div className="flex items-center gap-2 bg-surface border border-border rounded-lg px-3 py-2.5">
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 397.7 311.7" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <linearGradient id="sol-em" x1="360.879" y1="351.455" x2="141.213" y2="-69.294" gradientUnits="userSpaceOnUse" gradientTransform="translate(0 -25)"><stop offset="0" stopColor="#00FFA3"/><stop offset="1" stopColor="#DC1FFF"/></linearGradient>
                    <path d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1l62.7-62.7z" fill="url(#sol-em)"/>
                    <path d="M64.6 3.8C67.1 1.4 70.4 0 73.8 0h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1L64.6 3.8z" fill="url(#sol-em)"/>
                    <path d="M333.1 120.1c-2.4-2.4-5.7-3.8-9.2-3.8H6.5c-5.8 0-8.7 7-4.6 11.1l62.7 62.7c2.4 2.4 5.7 3.8 9.2 3.8h317.4c5.8 0 8.7-7 4.6-11.1l-62.7-62.7z" fill="url(#sol-em)"/>
                  </svg>
                  <span className="text-sm text-foreground">Solana</span>
                </div>
              </div>

              {/* Token Address */}
              <div>
                <label className="text-xs font-medium text-foreground-secondary block mb-1.5">Token Address</label>
                <input
                  type="text"
                  placeholder="Enter token mint address..."
                  value={form.tokenAddress}
                  onChange={(e) => update("tokenAddress", e.target.value)}
                  className="w-full bg-surface border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted/40 focus:outline-none focus:border-accent/50 transition-colors"
                />

                {/* Token preview card */}
                {metaLoading && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-muted">
                    <div className="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
                    Fetching token info...
                  </div>
                )}
                {tokenMeta && !metaLoading && (
                  <div className="mt-3 flex items-center gap-3 p-3 bg-surface border border-border rounded-xl">
                    {tokenMeta.image ? (
                      <img
                        src={tokenMeta.image}
                        alt={tokenMeta.name}
                        className="w-10 h-10 rounded-lg object-cover border border-border"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center text-accent text-sm font-bold">
                        {tokenMeta.symbol?.charAt(0) || "?"}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-semibold text-foreground">{tokenMeta.name}</p>
                      <p className="text-xs text-muted">{tokenMeta.symbol}</p>
                    </div>
                    <svg className="w-4 h-4 text-green ml-auto" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-medium text-foreground-secondary block mb-1.5">Description</label>
                <textarea
                  placeholder="Project description. Plain text only. Simple and multiline phrases. Description will be displayed on the pair details page on PumpScreener."
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                  rows={4}
                  className="w-full bg-surface border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted/40 focus:outline-none focus:border-accent/50 transition-colors resize-none"
                />
              </div>

              {/* Links */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">Links</h3>
                <div className="grid grid-cols-2 gap-3">
                  <InputField label="Add Website" placeholder="https://..." value={form.website} onChange={(v) => update("website", v)} />
                  <InputField label="Add Docs" placeholder="https://docs..." value={form.discord} onChange={(v) => update("discord", v)} />
                  <InputField label="Add X" placeholder="https://x.com/..." value={form.twitter} onChange={(v) => update("twitter", v)} />
                  <InputField label="Add Telegram" placeholder="https://t.me/..." value={form.telegram} onChange={(v) => update("telegram", v)} />
                  <InputField label="Add Discord" placeholder="https://discord.gg/..." value={form.discord} onChange={(v) => update("discord", v)} />
                  <InputField label="Add Tiktok" placeholder="https://tiktok.com/@..." value={form.tiktok} onChange={(v) => update("tiktok", v)} />
                  <InputField label="Add Instagram" placeholder="https://instagram.com/..." value={form.instagram} onChange={(v) => update("instagram", v)} />
                  <InputField label="Add Reddit" placeholder="https://reddit.com/r/..." value={form.reddit} onChange={(v) => update("reddit", v)} />
                  <InputField label="Add Youtube" placeholder="https://youtube.com/..." value={form.youtube} onChange={(v) => update("youtube", v)} />
                </div>
              </div>

              {/* Additional links */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-1">Additional links</h3>
                <p className="text-xs text-muted mb-3">Please provide additional links that don&apos;t fit into the above categories.</p>
                {form.additionalLinks.map((link, i) => (
                  <div key={i} className="flex items-center gap-2 mb-2">
                    <input
                      type="text"
                      placeholder="https://..."
                      value={link}
                      onChange={(e) => updateLink(i, e.target.value)}
                      className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted/40 focus:outline-none focus:border-accent/50 transition-colors"
                    />
                    <button onClick={() => removeLink(i)} className="text-muted hover:text-red transition-colors p-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
                <button onClick={addLink}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-surface border border-border text-foreground-secondary hover:text-foreground hover:border-border-bright transition-all">
                  Add link
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Images */}
          {step === 2 && (
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-bold text-foreground mb-4">Images</h3>

                {/* Token image from metadata */}
                {tokenMeta?.image && (
                  <div className="mb-6 p-4 bg-surface/50 border border-border rounded-xl">
                    <p className="text-xs font-medium text-muted mb-2">Token image (from on-chain metadata)</p>
                    <div className="flex items-center gap-3">
                      <img src={tokenMeta.image} alt={tokenMeta.name} className="w-16 h-16 rounded-xl object-cover border border-border" />
                      <div>
                        <p className="text-sm font-semibold text-foreground">{tokenMeta.name}</p>
                        <p className="text-xs text-muted">{tokenMeta.symbol}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Icon */}
                <div className="mb-8">
                  <h4 className="text-sm font-semibold text-foreground mb-2">Custom Icon (optional override)</h4>
                  <ul className="text-xs text-muted space-y-1 mb-3 list-disc list-inside">
                    <li>1:1 aspect ratio (square, for example 168x168px or 500x500px)</li>
                    <li>min. image width: 100px</li>
                    <li>support formats: png, jpg, webp and gif</li>
                    <li>max. file size: 4.5MB</li>
                  </ul>

                  <input ref={iconInputRef} type="file" accept="image/*" className="hidden"
                    onChange={(e) => handleFileChange("icon", e.target.files?.[0] || null)} />

                  {form.iconPreview ? (
                    <div className="flex items-center gap-4">
                      <img src={form.iconPreview} alt="Icon preview" className="w-16 h-16 rounded-xl object-cover border border-border" />
                      <button onClick={() => iconInputRef.current?.click()}
                        className="px-4 py-2 rounded-lg text-sm font-medium bg-surface border border-border text-foreground-secondary hover:text-foreground hover:border-border-bright transition-all">
                        Change image
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => iconInputRef.current?.click()}
                      className="w-full py-3 rounded-lg text-sm font-medium bg-surface border border-border text-foreground-secondary hover:text-foreground hover:border-accent/30 transition-all">
                      Upload image
                    </button>
                  )}
                </div>

                {/* Header */}
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-2">Header</h4>
                  <ul className="text-xs text-muted space-y-1 mb-3 list-disc list-inside">
                    <li>3:1 aspect ratio (rectangle, for example 600x200px or 1500x500px)</li>
                    <li>min. image width: 600px</li>
                    <li>support formats: png, jpg, webp and gif</li>
                    <li>max. file size: 4.5MB</li>
                  </ul>

                  <input ref={headerInputRef} type="file" accept="image/*" className="hidden"
                    onChange={(e) => handleFileChange("header", e.target.files?.[0] || null)} />

                  {form.headerPreview ? (
                    <div className="space-y-3">
                      <img src={form.headerPreview} alt="Header preview"
                        className="w-full rounded-xl object-cover border border-border" style={{ aspectRatio: "3/1" }} />
                      <button onClick={() => headerInputRef.current?.click()}
                        className="px-4 py-2 rounded-lg text-sm font-medium bg-surface border border-border text-foreground-secondary hover:text-foreground hover:border-border-bright transition-all">
                        Change image
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => headerInputRef.current?.click()}
                      className="w-full py-3 rounded-lg text-sm font-medium bg-surface border border-border text-foreground-secondary hover:text-foreground hover:border-accent/30 transition-all">
                      Upload image
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Order Summary */}
          {step === 3 && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-foreground">Order summary</h3>

              {/* Token preview */}
              {tokenMeta && (
                <div className="flex items-center gap-3 p-3 bg-surface border border-border rounded-xl">
                  {tokenMeta.image && (
                    <img src={tokenMeta.image} alt={tokenMeta.name} className="w-10 h-10 rounded-lg object-cover border border-border" />
                  )}
                  <div>
                    <p className="text-sm font-semibold text-foreground">{tokenMeta.name}</p>
                    <p className="text-xs text-muted font-mono">{form.tokenAddress.slice(0, 8)}...{form.tokenAddress.slice(-6)}</p>
                  </div>
                </div>
              )}

              {/* Product table */}
              <div className="border border-border rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface/50">
                  <span className="text-xs font-semibold text-muted uppercase tracking-wider">Product</span>
                  <span className="text-xs font-semibold text-muted uppercase tracking-wider">Price</span>
                </div>
                <div className="px-4 py-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Enhanced Token Info</p>
                      <p className="text-xs text-muted mt-1">
                        ETA: Submission will be verified by PumpScreener. Average processing time after receiving payment is less than 15 minutes.
                      </p>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <span className="text-sm text-muted line-through mr-2">$49.00</span>
                      <span className="text-lg font-bold text-foreground">{PRICE_SOL} SOL</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Wallet connection status */}
              <div className="flex items-center gap-2 p-3 rounded-xl border border-border bg-surface/50">
                <div className={`w-2 h-2 rounded-full ${connected ? "bg-green" : "bg-muted"}`} />
                {connected ? (
                  <span className="text-xs text-foreground-secondary">
                    Connected: <span className="font-mono">{publicKey?.toBase58().slice(0, 4)}...{publicKey?.toBase58().slice(-4)}</span>
                  </span>
                ) : (
                  <button
                    onClick={() => setWalletModalVisible(true)}
                    className="text-xs text-accent hover:text-accent/80 font-medium transition-colors"
                  >
                    Connect wallet to pay
                  </button>
                )}
              </div>

              {/* Checkboxes */}
              <div className="space-y-4">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="mt-0.5 shrink-0">
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                        form.agreedTerms ? "bg-accent border-accent" : "border-border group-hover:border-border-bright"
                      }`}
                      onClick={() => update("agreedTerms", !form.agreedTerms)}
                    >
                      {form.agreedTerms && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <span className="text-sm text-foreground-secondary">
                    I understand that all supplied data must be verifiable through official channels such as <strong className="text-foreground">website and socials</strong>.
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="mt-0.5 shrink-0">
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                        form.agreedModify ? "bg-accent border-accent" : "border-border group-hover:border-border-bright"
                      }`}
                      onClick={() => update("agreedModify", !form.agreedModify)}
                    >
                      {form.agreedModify && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <span className="text-sm text-foreground-secondary">
                    I understand and accept that <strong className="text-foreground">PumpScreener</strong> reserves the right to reject or modify the provided information.
                  </span>
                </label>
              </div>

              <p className="text-xs text-muted">
                By completing this purchase, I confirm that I&apos;ve read and agree to the{" "}
                <span className="text-foreground-secondary underline cursor-pointer">Refund Policy</span>.
              </p>

              {/* Error / Success */}
              {payError && (
                <div className="text-xs text-red bg-red/10 border border-red/20 rounded-lg px-3 py-2">
                  {payError}
                </div>
              )}
              {paySuccess && (
                <div className="text-xs text-green bg-green/10 border border-green/20 rounded-lg px-3 py-2">
                  Payment successful! Your submission is being processed.
                </div>
              )}

              {/* Order button */}
              {!paySuccess ? (
                <button
                  onClick={handlePay}
                  disabled={!canOrder || paying}
                  className={`w-full py-3 rounded-xl text-sm font-semibold transition-all ${
                    canOrder && !paying
                      ? "bg-accent hover:bg-accent/90 text-white cursor-pointer"
                      : "bg-surface text-muted border border-border cursor-not-allowed"
                  }`}
                >
                  {paying ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Confirming...
                    </span>
                  ) : !connected ? (
                    "Connect Wallet & Pay"
                  ) : (
                    `Pay ${PRICE_SOL} SOL`
                  )}
                </button>
              ) : (
                <button
                  onClick={onClose}
                  className="w-full py-3 rounded-xl text-sm font-semibold bg-green/20 text-green border border-green/30 hover:bg-green/30 transition-all"
                >
                  Done
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer navigation */}
        <div className="border-t border-border px-6 py-4 flex items-center justify-between shrink-0">
          {step > 1 ? (
            <button onClick={() => setStep((step - 1) as Step)}
              className="px-4 py-2 rounded-lg text-sm font-medium text-foreground-secondary hover:text-foreground transition-colors">
              Back
            </button>
          ) : (
            <div />
          )}

          {step < 3 && (
            <button
              onClick={() => setStep((step + 1) as Step)}
              disabled={step === 1 && !canProceedStep1}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                (step === 1 && !canProceedStep1)
                  ? "bg-surface text-muted border border-border cursor-not-allowed"
                  : "bg-accent text-white hover:bg-accent/90"
              }`}
            >
              Continue
            </button>
          )}
        </div>
      </div>

      <style jsx>{`
        .animate-in {
          animation: scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes scaleIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
