"use client";
import { useState, useRef, useEffect } from "react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Building2,
  User,
  Mail,
  Lock,
  Database,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
} from "lucide-react";

const PIN_LENGTH = 9; // "teltech352" → 9 chars but we use text input

type Step = "pin" | "form" | "success";

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

export default function SysInitPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("pin");

  // ── PIN step ──────────────────────────────────────────────────────────
  const [pinDigits, setPinDigits] = useState<string[]>(Array(9).fill(""));
  const [pinError, setpinError] = useState("");
  const [pinShake, setPinShake] = useState(false);
  const [pinLoading, setPinLoading] = useState(false);
  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);

  // ── Form step ─────────────────────────────────────────────────────────
  const [tenantName, setTenantName] = useState("");
  const [dbName, setDbName] = useState("");
  const [dbNameManual, setDbNameManual] = useState(false);
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminPasswordConfirm, setAdminPasswordConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  // ── Success step ──────────────────────────────────────────────────────
  const [successData, setSuccessData] = useState<any>(null);

  // Auto-fill dbName from tenantName
  useEffect(() => {
    if (!dbNameManual && tenantName) {
      setDbName(slugify(tenantName));
    }
  }, [tenantName, dbNameManual]);

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (pinDigits[index]) {
        const next = [...pinDigits];
        next[index] = "";
        setPinDigits(next);
      } else if (index > 0) {
        pinRefs.current[index - 1]?.focus();
      }
    }
  };

  const handlePinChange = (index: number, value: string) => {
    const char = value.slice(-1);
    const next = [...pinDigits];
    next[index] = char;
    setPinDigits(next);
    if (char && index < PIN_LENGTH - 1) {
      pinRefs.current[index + 1]?.focus();
    }
  };

  const handlePinPaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").slice(0, PIN_LENGTH);
    const next = Array(PIN_LENGTH).fill("");
    pasted.split("").forEach((c, i) => (next[i] = c));
    setPinDigits(next);
    pinRefs.current[Math.min(pasted.length, PIN_LENGTH - 1)]?.focus();
  };

  const handleValidatePin = async () => {
    const pin = pinDigits.join("");
    if (pin.length < PIN_LENGTH) {
      setpinError("Digite todos os caracteres do PIN.");
      triggerShake();
      return;
    }
    setPinLoading(true);
    setpinError("");
    try {
      await api.post("/tenants/setup/validate-pin", { pin });
      // Transição suave para o formulário
      setTimeout(() => setStep("form"), 300);
    } catch {
      setpinError("PIN incorreto. Acesso negado.");
      triggerShake();
      setPinDigits(Array(PIN_LENGTH).fill(""));
      pinRefs.current[0]?.focus();
    } finally {
      setPinLoading(false);
    }
  };

  const triggerShake = () => {
    setPinShake(true);
    setTimeout(() => setPinShake(false), 600);
  };

  const handleProvision = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (adminPassword !== adminPasswordConfirm) {
      setFormError("As senhas não coincidem.");
      return;
    }
    if (adminPassword.length < 6) {
      setFormError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setFormLoading(true);
    try {
      const pin = pinDigits.join("");
      const { data } = await api.post("/tenants/setup", {
        pin,
        tenantName,
        dbName,
        adminName,
        adminEmail,
        adminPassword,
      });
      setSuccessData(data);
      setStep("success");
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Erro ao provisionar. Tente novamente.";
      setFormError(msg);
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black text-white relative overflow-hidden">
      {/* Background glows */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-violet-700 rounded-full blur-[140px] opacity-20" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-indigo-600 rounded-full blur-[160px] opacity-15" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-px h-full bg-gradient-to-b from-transparent via-violet-500/10 to-transparent" />
      </div>

      <div className="relative z-10 w-full max-w-md px-4">
        {/* Header badge */}
        <div className="flex justify-center mb-6">
          <span className="text-xs font-mono text-violet-400 bg-violet-500/10 border border-violet-500/20 px-3 py-1 rounded-full tracking-widest uppercase">
            sys-init · acesso restrito
          </span>
        </div>

        {/* ── STEP: PIN ─────────────────────────────────────────────────── */}
        {step === "pin" && (
          <div className={`transition-all duration-300 ${pinShake ? "animate-[shake_0.4s_ease]" : ""}`}>
            <div className="p-8 rounded-3xl bg-zinc-900/70 backdrop-blur-xl border border-zinc-800 shadow-2xl">
              <div className="flex flex-col items-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center mb-4 shadow-lg shadow-violet-500/20">
                  <ShieldCheck size={30} className="text-violet-400" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight">Acesso de Sistema</h1>
                <p className="text-zinc-400 text-sm mt-2 text-center">
                  Digite o PIN de inicialização para continuar
                </p>
              </div>

              <div className="mb-6">
                <label className="text-xs text-zinc-500 uppercase tracking-wider mb-3 block">
                  PIN de Acesso ({PIN_LENGTH} caracteres)
                </label>
                <div
                  className="flex gap-2 justify-center"
                  onPaste={handlePinPaste}
                >
                  {pinDigits.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => { pinRefs.current[i] = el; }}
                      type="password"
                      maxLength={2}
                      value={digit}
                      onChange={(e) => handlePinChange(i, e.target.value)}
                      onKeyDown={(e) => handlePinKeyDown(i, e)}
                      className={`w-9 h-11 text-center text-lg font-bold rounded-xl border transition-all outline-none
                        ${digit
                          ? "bg-violet-600/20 border-violet-500/60 text-white"
                          : "bg-zinc-950/50 border-zinc-700 text-white"
                        }
                        focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30`}
                      autoFocus={i === 0}
                    />
                  ))}
                </div>
              </div>

              {pinError && (
                <div className="flex items-center gap-2 text-red-400 text-sm mb-4 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                  <AlertCircle size={16} />
                  {pinError}
                </div>
              )}

              <button
                onClick={handleValidatePin}
                disabled={pinLoading}
                className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-lg shadow-violet-600/25 active:scale-95 flex justify-center items-center gap-2"
              >
                {pinLoading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <>
                    Verificar PIN
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP: FORM ────────────────────────────────────────────────── */}
        {step === "form" && (
          <div className="animate-[fadeIn_0.4s_ease]">
            <div className="p-8 rounded-3xl bg-zinc-900/70 backdrop-blur-xl border border-zinc-800 shadow-2xl">
              <div className="flex flex-col items-center mb-7">
                <div className="w-16 h-16 rounded-2xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/20">
                  <Building2 size={30} className="text-emerald-400" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight">Novo Tenant</h1>
                <p className="text-zinc-400 text-sm mt-1 text-center">
                  Preencha os dados para provisionar o sistema
                </p>
              </div>

              <form onSubmit={handleProvision} className="space-y-4">
                {/* Tenant Name */}
                <div>
                  <label className="text-xs text-zinc-400 uppercase tracking-wider mb-1.5 block">
                    Nome da Empresa
                  </label>
                  <div className="relative">
                    <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                      type="text"
                      required
                      value={tenantName}
                      onChange={(e) => setTenantName(e.target.value)}
                      placeholder="Bar do João"
                      className="w-full pl-9 pr-4 py-2.5 bg-zinc-950/50 border border-zinc-700 rounded-xl focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all text-white placeholder-zinc-600 text-sm"
                    />
                  </div>
                </div>

                {/* DB Name */}
                <div>
                  <label className="text-xs text-zinc-400 uppercase tracking-wider mb-1.5 flex items-center gap-2">
                    <span>Nome do Banco</span>
                    <span className="text-zinc-600 normal-case font-normal">(gerado automaticamente)</span>
                  </label>
                  <div className="relative">
                    <Database size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                      type="text"
                      required
                      value={dbName}
                      onChange={(e) => {
                        setDbName(e.target.value);
                        setDbNameManual(true);
                      }}
                      placeholder="bar_do_joao"
                      className="w-full pl-9 pr-4 py-2.5 bg-zinc-950/50 border border-zinc-700 rounded-xl focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all text-white placeholder-zinc-600 text-sm font-mono"
                    />
                  </div>
                </div>

                <div className="border-t border-zinc-800 my-1" />

                {/* Admin Name */}
                <div>
                  <label className="text-xs text-zinc-400 uppercase tracking-wider mb-1.5 block">
                    Nome do Admin
                  </label>
                  <div className="relative">
                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                      type="text"
                      required
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      placeholder="João Silva"
                      className="w-full pl-9 pr-4 py-2.5 bg-zinc-950/50 border border-zinc-700 rounded-xl focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all text-white placeholder-zinc-600 text-sm"
                    />
                  </div>
                </div>

                {/* Admin Email */}
                <div>
                  <label className="text-xs text-zinc-400 uppercase tracking-wider mb-1.5 block">
                    Email do Admin
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                      type="email"
                      required
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      placeholder="joao@bar.com.br"
                      className="w-full pl-9 pr-4 py-2.5 bg-zinc-950/50 border border-zinc-700 rounded-xl focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all text-white placeholder-zinc-600 text-sm"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="text-xs text-zinc-400 uppercase tracking-wider mb-1.5 block">
                    Senha de Acesso
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                      type={showPass ? "text" : "password"}
                      required
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full pl-9 pr-10 py-2.5 bg-zinc-950/50 border border-zinc-700 rounded-xl focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all text-white placeholder-zinc-600 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                    >
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="text-xs text-zinc-400 uppercase tracking-wider mb-1.5 block">
                    Confirmar Senha
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                      type={showPass ? "text" : "password"}
                      required
                      value={adminPasswordConfirm}
                      onChange={(e) => setAdminPasswordConfirm(e.target.value)}
                      placeholder="Repita a senha"
                      className={`w-full pl-9 pr-4 py-2.5 bg-zinc-950/50 border rounded-xl focus:ring-2 transition-all text-white placeholder-zinc-600 text-sm
                        ${adminPasswordConfirm && adminPassword !== adminPasswordConfirm
                          ? "border-red-500/60 focus:ring-red-500/30"
                          : "border-zinc-700 focus:ring-emerald-500/40 focus:border-emerald-500"
                        }`}
                    />
                  </div>
                </div>

                {formError && (
                  <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                    <AlertCircle size={16} className="shrink-0" />
                    {formError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={formLoading}
                  className="w-full mt-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-lg shadow-emerald-600/20 active:scale-95 flex justify-center items-center gap-2"
                >
                  {formLoading ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      <span>Provisionando sistema...</span>
                    </>
                  ) : (
                    <>
                      Provisionar Sistema
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ── STEP: SUCCESS ─────────────────────────────────────────────── */}
        {step === "success" && successData && (
          <div className="animate-[fadeIn_0.5s_ease]">
            <div className="p-8 rounded-3xl bg-zinc-900/70 backdrop-blur-xl border border-zinc-800 shadow-2xl text-center">
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 rounded-full bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <CheckCircle2 size={40} className="text-emerald-400" />
                </div>
              </div>

              <h1 className="text-2xl font-bold mb-2">Sistema Provisionado!</h1>
              <p className="text-zinc-400 text-sm mb-6">
                O tenant foi criado com sucesso. Banco de dados, tabelas e produtos base já estão prontos.
              </p>

              <div className="bg-zinc-950/60 border border-zinc-700 rounded-2xl p-5 text-left space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Empresa</span>
                  <span className="font-semibold text-white">{successData.tenant?.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Banco</span>
                  <span className="font-mono text-emerald-400">{successData.tenant?.database_name}</span>
                </div>
                <div className="border-t border-zinc-800" />
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Admin</span>
                  <span className="font-semibold text-white">{successData.tenant?.admin?.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Email</span>
                  <span className="text-blue-400">{successData.tenant?.admin?.email}</span>
                </div>
              </div>

              <button
                onClick={() => router.push("/login")}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-lg shadow-blue-600/20 active:scale-95 flex justify-center items-center gap-2"
              >
                Ir para o Login
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
